import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPublicKey, verify } from 'crypto';
import { TELNYX_API_KEY } from '$env/static/private';
import { addPendingCall } from '$lib/utils/callStore';
import { prisma } from '$lib/db';
import { getActiveCallFlow, toAbsoluteAudioUrl } from '$lib/ivr';
import { getCompanyAndFlowByPhoneNumber, toE164 } from '$lib/company-numbers';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { notifyIncomingCallViaPush } from '$lib/server/push/incoming-call';

const TELNYX_PUBLIC_KEY = process.env.TELNYX_PUBLIC_KEY;

const playPublic = false;
const publicTestAudio = 'https://audio.jukehost.co.uk/fWZ2egpjSuSEtT7Z3ny7fKYFhJcKY7g7';

function resolveAudioUrl(path: string | null | undefined, baseUrl: string): string | null {
	if (playPublic) return publicTestAudio;
	return toAbsoluteAudioUrl(path, baseUrl);
}

/** Get first usable audio URL from recording_urls (mp3, m4a, or any URL string). */
function getFirstAudioUrl(recUrls: unknown): string | null {
	if (!recUrls || typeof recUrls !== 'object') return null;
	const o = recUrls as Record<string, unknown>;
	const keys = ['mp3', 'm4a', 'wav'];
	for (const k of keys) {
		if (typeof o[k] === 'string' && (o[k] as string).startsWith('http')) return o[k] as string;
	}
	for (const v of Object.values(o)) {
		if (typeof v === 'string' && v.startsWith('http')) return v;
	}
	return null;
}

/** Compute call duration in seconds from hangup payload start_time / end_time. */
function computeDurationFromPayload(payload: Record<string, unknown>): number | null {
	const start = payload?.start_time as string | undefined;
	const end = payload?.end_time as string | undefined;
	if (!start || !end) return null;
	try {
		const startMs = new Date(start).getTime();
		const endMs = new Date(end).getTime();
		if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
		return Math.round((endMs - startMs) / 1000);
	} catch {
		return null;
	}
}

/** Verify Telnyx webhook signature (Ed25519). Signed payload = timestamp|rawBody. Skip if TELNYX_PUBLIC_KEY not set. */
function verifyTelnyxSignature(rawBody: string, timestamp: string, signatureB64: string): boolean {
	if (!TELNYX_PUBLIC_KEY) return true;
	try {
		const payload = `${timestamp}|${rawBody}`;
		const sig = Buffer.from(signatureB64, 'base64');
		const key = TELNYX_PUBLIC_KEY.includes('-----BEGIN')
			? createPublicKey({ key: TELNYX_PUBLIC_KEY, format: 'pem' })
			: createPublicKey({
					key: Buffer.from(TELNYX_PUBLIC_KEY, 'base64'),
					format: 'raw',
					type: 'ed25519'
				});
		return verify(null, Buffer.from(payload, 'utf8'), key, sig);
	} catch {
		return false;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const rawBody = await request.text();
		const timestamp = request.headers.get('telnyx-timestamp') ?? '';
		const signature = request.headers.get('telnyx-signature-ed25519') ?? '';
		if (TELNYX_PUBLIC_KEY && (!timestamp || !signature)) {
			return json({ error: 'Missing webhook signature headers' }, { status: 401 });
		}
		if (TELNYX_PUBLIC_KEY && !verifyTelnyxSignature(rawBody, timestamp, signature)) {
			return json({ error: 'Invalid webhook signature' }, { status: 401 });
		}

		// IVR, recording, and comm-log creation always run locally. A2P is used only for
		// communication-logs UI (e.g. isA2pCommLogEnabled / api/a2p/communication-log).
		const body = JSON.parse(rawBody);

		// Detect webhook format: Event API (wrapped) vs Call Control (direct)
		const isEventAPI = body.data?.event_type;
		const isCallControl = body.call_control_id;

		let eventType: string;
		let callControlId: string;
		let payload: Record<string, unknown>;

		if (isEventAPI) {
			// Event API format (test webhooks)
			eventType = body.data.event_type;
			callControlId = body.data.payload.call_control_id;
			payload = body.data.payload;
			console.log('📞 Event API webhook:', eventType, callControlId);
		} else if (isCallControl) {
			// Call Control format (production webhooks) – use explicit event_type when present
			callControlId = body.call_control_id;
			payload = body;
			const explicitEventType = body.event_type as string | undefined;
			if (explicitEventType) {
				eventType = explicitEventType;
			} else {
				if (body.state === 'parked' && !body.hangup_cause) {
					eventType = 'call.initiated';
				} else if (body.hangup_cause) {
					eventType = 'call.hangup';
				} else if (body.start_time && !body.hangup_cause) {
					eventType = 'call.answered';
				} else {
					eventType = 'call.unknown';
				}
			}
			console.log('📞 Call Control webhook:', eventType, callControlId, 'state:', body.state);
		} else {
			console.log('❓ Unknown webhook format:', body);
			return json({ success: true }); // Acknowledge unknown format
		}

		// For answering machine detection result
		let detectionResult: string | undefined;

		// Process different call events
		switch (eventType) {
			case 'call.initiated': {
				console.log('Call initiated:', callControlId);
				await logCallEvent(callControlId, 'initiated', payload);

				// Incoming: "to" is the number that received the call. Resolve company by that number.
				const toRaw = (payload?.to as string) || '';
				const fromNumber = (payload?.from as string) || '';
				const callerName = (payload?.caller_id_name as string) || 'Unknown Caller';
				const isIncomingCall = payload?.direction === 'incoming';

				if (isIncomingCall) {
					const numberInfo = await getCompanyAndFlowByPhoneNumber(prisma, toRaw);
					console.log(
						'🔔 Incoming call to:',
						toRaw,
						'from:',
						fromNumber,
						'companyId:',
						numberInfo?.companyId ?? 'none',
						'callFlowId:',
						numberInfo?.callFlowId ?? 'none'
					);

					if (numberInfo?.companyId) {
						void notifyIncomingCallViaPush({
							companyId: numberInfo.companyId,
							callControlId,
							from: fromNumber,
							to: toRaw,
							callerName
						}).catch((err) => console.error('[push] incoming call notify:', err));
					}

					if (!numberInfo) {
						addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
						console.log('📞 Number not assigned to a company - stored in pending calls');
					} else if (!numberInfo.callFlowId) {
						addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
						console.log('📞 Number not assigned to IVR - stored in pending calls');
					} else {
						const company = await prisma.company.findUnique({
							where: { id: numberInfo.companyId },
							select: { settings: true }
						});
						const timezone =
							(company?.settings as { timezone?: string } | null)?.timezone ?? 'America/New_York';
						const active = await getActiveCallFlow(prisma, numberInfo.companyId, new Date(), {
							timezone,
							flowId: numberInfo.callFlowId
						});
						if (active) {
							const clientState = Buffer.from(
								JSON.stringify({ ivrFlowId: active.flow.id, ivrRuleId: active.rule.id })
							).toString('base64');
							try {
								await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										Authorization: `Bearer ${TELNYX_API_KEY}`
									},
									body: JSON.stringify({
										record: 'record-from-answer',
										client_state: clientState
									})
								});
								console.log('✅ IVR flow answered:', active.flow.title, active.rule.ruleTitle);
							} catch (err) {
								console.error('❌ IVR answer failed:', err);
								addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
							}
						} else {
							addPendingCall({ name: callerName, phone: fromNumber, callId: callControlId });
							console.log('📞 No active IVR rule for this time - stored in pending calls');
						}
					}
				} else {
					// For outbound calls, we can still auto-answer
					if (callControlId) {
						try {
							await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									Authorization: `Bearer ${TELNYX_API_KEY}`
								},
								body: JSON.stringify({ record: 'record-from-answer' })
							});
							console.log('✅ Outbound call answered and recording started');
						} catch (error) {
							console.error('❌ Error answering/recording outbound call:', error);
						}
					}
				}
				break;
			}

			case 'call.answered': {
				console.log('✅ Call answered:', callControlId);
				await logCallEvent(callControlId, 'answered', payload);
				let ivrFlowId: string | null = null;
				let ivrRuleId: string | null = null;
				if (payload?.client_state) {
					try {
						const decoded = JSON.parse(
							Buffer.from(payload.client_state as string, 'base64').toString('utf8')
						);
						ivrFlowId = decoded.ivrFlowId ?? null;
						ivrRuleId = decoded.ivrRuleId ?? null;
					} catch (_) {}
				}
				if (ivrFlowId && ivrRuleId && callControlId) {
					const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
					const flow = await prisma.callFlow.findUnique({
						where: { id: ivrFlowId },
						include: { rules: { where: { id: ivrRuleId } } }
					});
					const rule = flow?.rules?.[0];
					if (flow && rule) {
						const greetingUrl = resolveAudioUrl(flow.greetingAudioUrl, baseUrl);
						const promptsUrl = resolveAudioUrl(rule.promptsAudioUrl, baseUrl);
						try {
							if (greetingUrl && !promptsUrl) {
								// Only greeting, no prompts (unusual for IVR but safe fallback)
								await telnyxPlayback(callControlId, greetingUrl);
								console.log('▶️ IVR greeting started (no prompts)');
							} else if (greetingUrl && promptsUrl) {
								// Greeting THEN Prompts+Gather
								const nextState = Buffer.from(
									JSON.stringify({
										ivrFlowId,
										ivrRuleId,
										afterGreetingGather: true
									})
								).toString('base64');

								await telnyxPlayback(callControlId, greetingUrl, nextState);
								console.log('▶️ IVR greeting started, waiting for playback end to gather');
							} else if (promptsUrl) {
								// No greeting, just Prompts+Gather immediately
								const nextState = Buffer.from(JSON.stringify({ ivrFlowId, ivrRuleId })).toString(
									'base64'
								);

								await fetch(
									`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`,
									{
										method: 'POST',
										headers: {
											'Content-Type': 'application/json',
											Authorization: `Bearer ${TELNYX_API_KEY}`
										},
										body: JSON.stringify({
											audio_url: promptsUrl,
											minimum_digits: 1,
											maximum_digits: 1,
											timeout_millis: 10000,
											terminating_digit: '#',
											client_state: nextState
										})
									}
								);
								console.log('▶️ IVR gather started (no greeting)');
							}
						} catch (err) {
							console.error('❌ IVR playback/gather failed:', err);
						}
					}
				}
				break;
			}

			case 'call.gather.ended': {
				const digits = (payload?.digits as string) ?? '';
				const status = (payload?.status as string) ?? '';
				let ivrFlowId: string | null = null;
				let ivrRuleId: string | null = null;
				let ivrRetry = 0;
				if (payload?.client_state) {
					try {
						const decoded = JSON.parse(
							Buffer.from(payload.client_state as string, 'base64').toString('utf8')
						);
						ivrFlowId = decoded.ivrFlowId ?? null;
						ivrRuleId = decoded.ivrRuleId ?? null;
						ivrRetry = Number(decoded.ivrRetry) || 0;
					} catch (_) {}
				}
				if (!callControlId || !ivrFlowId || !ivrRuleId) {
					console.log('📞 gather.ended missing callControlId or IVR state, ignoring');
					break;
				}
				const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
				const flow = await prisma.callFlow.findUnique({
					where: { id: ivrFlowId },
					include: { rules: { where: { id: ivrRuleId } } }
				});
				const rule = flow?.rules?.[0];
				if (!flow || !rule) {
					console.log('📞 gather.ended flow/rule not found');
					break;
				}
				const keyPrompts =
					(rule.keyPrompts as {
						key: string;
						name?: string;
						extension?: string;
						transferAudioUrl?: string;
					}[]) ?? [];
				const failoverCount = rule.failoverCount ?? 2;
				const failoverUrl = resolveAudioUrl(rule.failoverAudioUrl, baseUrl);
				const hangupUrl = resolveAudioUrl(rule.hangupAudioUrl, baseUrl);
				const promptsUrl = resolveAudioUrl(rule.promptsAudioUrl, baseUrl);

				const encodeClientState = (extra: Record<string, unknown>) =>
					Buffer.from(JSON.stringify({ ivrFlowId, ivrRuleId, ...extra })).toString('base64');

				// Timeout or no digits: failover or hangup
				if (status !== 'valid' || !digits.trim()) {
					if (ivrRetry >= failoverCount) {
						if (hangupUrl) {
							const hangupState = Buffer.from(
								JSON.stringify({ afterPlaybackHangup: true })
							).toString('base64');
							await telnyxPlayback(callControlId, hangupUrl, hangupState);
						} else {
							await telnyxHangup(callControlId);
						}
						console.log('📞 IVR failover exhausted, playing hangup then hangup');
					} else {
						if (failoverUrl) {
							const nextState = encodeClientState({
								ivrRetry: ivrRetry + 1,
								afterPlaybackGather: true
							});
							await telnyxPlayback(callControlId, failoverUrl, nextState);
						} else {
							const nextState = encodeClientState({ ivrRetry: ivrRetry + 1 });
							await fetch(
								`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`,
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										Authorization: `Bearer ${TELNYX_API_KEY}`
									},
									body: JSON.stringify({
										audio_url: promptsUrl,
										minimum_digits: 1,
										maximum_digits: 1,
										timeout_millis: 10000,
										terminating_digit: '#',
										client_state: nextState
									})
								}
							);
						}
						console.log('📞 IVR failover retry', ivrRetry + 1);
					}
					break;
				}

				const digit = digits.trim().charAt(0);

				// # = leave message / hangup
				if (digit === '#') {
					if (hangupUrl) {
						const hangupState = Buffer.from(JSON.stringify({ afterPlaybackHangup: true })).toString(
							'base64'
						);
						await telnyxPlayback(callControlId, hangupUrl, hangupState);
					} else {
						await telnyxHangup(callControlId);
					}
					console.log('📞 IVR user chose hangup (#)');
					break;
				}

				// Back / repeat menu digit — replay prompts
				const backDigit = (rule as { backDigit?: string | null }).backDigit?.trim();
				if (backDigit && digit === backDigit && promptsUrl) {
					const nextState = encodeClientState({ ivrRetry: 0 });
					await fetch(
						`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${TELNYX_API_KEY}`
							},
							body: JSON.stringify({
								audio_url: promptsUrl,
								minimum_digits: 1,
								maximum_digits: 1,
								timeout_millis: 10000,
								terminating_digit: '#',
								client_state: nextState
							})
						}
					);
					console.log('📞 IVR back/repeat menu, replaying prompts');
					break;
				}

				const match = keyPrompts.find((p) => String(p.key).trim() === digit);
				if (match?.extension) {
					const to = String(match.extension).trim();
					const transferAudioUrl = match.transferAudioUrl
						? resolveAudioUrl(match.transferAudioUrl, baseUrl)
						: null;
					if (transferAudioUrl) {
						// Play transfer audio first, then transfer on playback.ended
						// Include ivrFlowId/ivrRuleId so * can return to menu
						const transferState = Buffer.from(
							JSON.stringify({ afterPlaybackTransfer: true, transferTo: to, ivrFlowId, ivrRuleId })
						).toString('base64');
						await telnyxPlayback(callControlId, transferAudioUrl, transferState);
						console.log('▶️ IVR playing transfer audio for', match.name ?? digit);
					} else {
						await telnyxTransfer(callControlId, to);
						console.log('📞 IVR transfer to', to, match.name ?? digit);
					}
				} else {
					// Unknown key: treat like timeout, failover or hangup
					if (ivrRetry >= failoverCount) {
						if (hangupUrl) {
							const hangupState = Buffer.from(
								JSON.stringify({ afterPlaybackHangup: true })
							).toString('base64');
							await telnyxPlayback(callControlId, hangupUrl, hangupState);
						} else {
							await telnyxHangup(callControlId);
						}
					} else {
						if (failoverUrl) {
							const nextState = encodeClientState({
								ivrRetry: ivrRetry + 1,
								afterPlaybackGather: true
							});
							await telnyxPlayback(callControlId, failoverUrl, nextState);
						} else {
							const nextState = encodeClientState({ ivrRetry: ivrRetry + 1 });
							await fetch(
								`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`,
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										Authorization: `Bearer ${TELNYX_API_KEY}`
									},
									body: JSON.stringify({
										audio_url: promptsUrl,
										minimum_digits: 1,
										maximum_digits: 1,
										timeout_millis: 10000,
										terminating_digit: '#',
										client_state: nextState
									})
								}
							);
						}
					}
				}
				break;
			}

			case 'call.playback.ended': {
				if (!callControlId || !payload?.client_state) break;
				try {
					const decoded = JSON.parse(
						Buffer.from(payload.client_state as string, 'base64').toString('utf8')
					);
					if (decoded.afterPlaybackHangup) {
						await telnyxHangup(callControlId);
						console.log('📞 IVR playback (hangup) ended, hanging up');
						break;
					}
					if (decoded.afterPlaybackTransfer && decoded.transferTo) {
						await telnyxTransfer(callControlId, decoded.transferTo);
						console.log('📞 IVR transfer to', decoded.transferTo, 'after transfer audio');
						break;
					}
					if (
						(decoded.afterPlaybackGather || decoded.afterGreetingGather) &&
						decoded.ivrFlowId &&
						decoded.ivrRuleId
					) {
						const flow = await prisma.callFlow.findUnique({
							where: { id: decoded.ivrFlowId },
							include: { rules: { where: { id: decoded.ivrRuleId } } }
						});
						const rule = flow?.rules?.[0];
						if (rule?.promptsAudioUrl || playPublic) {
							const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
							const promptsUrl = resolveAudioUrl(rule?.promptsAudioUrl, baseUrl);
							const nextState = Buffer.from(
								JSON.stringify({
									ivrFlowId: decoded.ivrFlowId,
									ivrRuleId: decoded.ivrRuleId,
									ivrRetry: decoded.afterPlaybackGather ? Number(decoded.ivrRetry) || 0 : 0
								})
							).toString('base64');
							await fetch(
								`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`,
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										Authorization: `Bearer ${TELNYX_API_KEY}`
									},
									body: JSON.stringify({
										audio_url: promptsUrl,
										minimum_digits: 1,
										maximum_digits: 1,
										timeout_millis: 10000,
										terminating_digit: '#',
										client_state: nextState
									})
								}
							);
							console.log('▶️ IVR gather started after playback/greeting');
						}
					}
				} catch (_) {}
				break;
			}

			case 'call.hangup': {
				console.log('📞 Call hangup:', callControlId);
				await logCallEvent(callControlId, 'ended', payload);

				// Create call record with duration on hangup (recording link added later in call.recording.saved)
				const hangupDuration = computeDurationFromPayload(payload);
				const callLog = await prisma.callLog.findFirst({
					where: { callId: callControlId, status: 'initiated' }
				});
				// Use direction from initiated call log (hangup payload can be wrong or missing)
				const directionFromMeta =
					(callLog?.metadata as { direction?: string })?.direction ?? 'incoming';
				const direction = directionFromMeta === 'incoming' ? 'inbound' : 'outbound';
				if (callLog) {
					const toInfo = callLog.to
						? await getCompanyAndFlowByPhoneNumber(prisma, callLog.to)
						: null;
					const fromInfo = callLog.from
						? await getCompanyAndFlowByPhoneNumber(prisma, callLog.from)
						: null;
					const numberInfo = toInfo ?? fromInfo;
					const companyNumber = toInfo ? callLog.to : fromInfo ? callLog.from : null;
					const contactNumber = toInfo ? callLog.from : fromInfo ? callLog.to : null;
					if (numberInfo?.companyId && contactNumber && companyNumber) {
						let contact = await prisma.contact.findFirst({
							where: { companyId: numberInfo.companyId, phone: contactNumber }
						});
						if (!contact) {
							contact = await prisma.contact.create({
								data: { companyId: numberInfo.companyId, phone: contactNumber, name: null }
							});
						}
						const companyNumberE164 = toE164(companyNumber);
						const numberRow = companyNumberE164
							? await prisma.companyPhoneNumber.findUnique({
									where: { phoneNumber: companyNumberE164 },
									select: { callTrackingCategoryId: true }
								})
							: null;
						await prisma.communicationLog.create({
							data: {
								type: 'voice',
								direction: direction as 'inbound' | 'outbound',
								status: 'completed',
								source: contactNumber,
								destination: companyNumber,
								companyId: numberInfo.companyId,
								customerId: contact.id,
								callTrackingCategoryId: numberRow?.callTrackingCategoryId ?? undefined,
								duration: hangupDuration,
								content:
									hangupDuration != null
										? `Call completed (${Math.round(hangupDuration)}s)`
										: 'Call completed',
								metadata: { call_control_id: callControlId, origin: directionFromMeta }
							}
						});
						console.log(
							'📝 Created CommunicationLog on hangup (duration, recording link added when saved)',
							callControlId
						);
					}
				}
				break;
			}

			case 'call.machine.detection.ended': {
				// Handle answering machine detection
				detectionResult =
					(payload?.result as string) ||
					(isEventAPI ? (body.data?.payload?.result as string) : undefined);
				console.log('🤖 Answering machine detection:', detectionResult);

				if (detectionResult === 'machine') {
					console.log('📞 Answering machine detected, leaving a message');
					await logCallEvent(callControlId, 'machine-detection-machine', payload);

					if (callControlId) {
						await playAudio(
							callControlId,
							'This is an automated message from Clearsky. Please call us back at your convenience.'
						);
					}
				} else if (detectionResult === 'human') {
					console.log('👤 Human answered, connecting call');
					await logCallEvent(callControlId, 'machine-detection-human', payload);
				}
				break;
			}

			case 'call.machine.premium.detection.ended': {
				// Handle premium answering machine detection
				detectionResult =
					(payload?.result as string) ||
					(isEventAPI ? (body.data?.payload?.result as string) : undefined);
				console.log('🤖 Premium answering machine detection:', detectionResult);

				if (detectionResult === 'machine') {
					console.log('📞 Premium: Answering machine detected, leaving a message');
					await logCallEvent(callControlId, 'premium-machine-detection-machine', payload);

					if (callControlId) {
						await playAudio(
							callControlId,
							'This is an automated message from Clearsky. Please call us back at your convenience.'
						);
					}
				} else if (detectionResult === 'human') {
					console.log('👤 Premium: Human answered, connecting call');
					await logCallEvent(callControlId, 'premium-machine-detection-human', payload);
				}
				break;
			}

			case 'call.machine.premium.greeting.ended': {
				// Handle when machine greeting ends (beep detected)
				console.log('📞 Premium: Machine greeting ended, beep detected');
				await logCallEvent(callControlId, 'premium-greeting-ended', payload);

				if (callControlId) {
					await playAudio(
						callControlId,
						'Hello, this is an automated message from Clearsky. We tried to reach you regarding your inquiry. Please call us back at your earliest convenience. Thank you.'
					);
				}
				break;
			}

			case 'call.dtmf.received': {
				// Handle back/repeat digit during transfer audio playback (use rule's backDigit, not hardcoded *)
				const dtmfDigit = (payload?.digit as string) ?? '';
				if (payload?.client_state) {
					try {
						const decoded = JSON.parse(
							Buffer.from(payload.client_state as string, 'base64').toString('utf8')
						);
						// If we're in a transfer playback, check if pressed digit is this rule's back digit
						if (decoded.afterPlaybackTransfer && decoded.ivrFlowId && decoded.ivrRuleId) {
							const flow = await prisma.callFlow.findUnique({
								where: { id: decoded.ivrFlowId },
								include: { rules: { where: { id: decoded.ivrRuleId } } }
							});
							const rule = flow?.rules?.[0];
							const backDigit = (rule as { backDigit?: string | null })?.backDigit?.trim();
							if (!backDigit || dtmfDigit !== backDigit) break;
							// Stop current playback and return to menu
							await fetch(
								`https://api.telnyx.com/v2/calls/${callControlId}/actions/playback_stop`,
								{
									method: 'POST',
									headers: TELNYX_HEADERS,
									body: JSON.stringify({})
								}
							);
							if (rule?.promptsAudioUrl || playPublic) {
								const baseUrl = PUBLIC_BASE_URL || 'https://example.com';
								const promptsUrl = resolveAudioUrl(rule?.promptsAudioUrl, baseUrl);
								const nextState = Buffer.from(
									JSON.stringify({
										ivrFlowId: decoded.ivrFlowId,
										ivrRuleId: decoded.ivrRuleId,
										ivrRetry: 0
									})
								).toString('base64');
								await fetch(
									`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`,
									{
										method: 'POST',
										headers: TELNYX_HEADERS,
										body: JSON.stringify({
											audio_url: promptsUrl,
											minimum_digits: 1,
											maximum_digits: 1,
											timeout_millis: 10000,
											terminating_digit: '#',
											client_state: nextState
										})
									}
								);
								console.log('📞 IVR back digit pressed during transfer, returning to menu');
							}
						}
					} catch (_) {}
				}
				break;
			}

			case 'call.recording.saved': {
				// Recording is available, save the URL(s)
				const recUrls = payload?.recording_urls;
				const recId = payload?.recording_id;
				const recDurationSeconds = typeof payload?.duration === 'number' ? payload.duration : 0;
				console.log('🎥 Call recording saved:', recId, recUrls);

				if (callControlId && recUrls) {
					// 1. Save reference call recording
					await prisma.callRecording.create({
						data: {
							callId: callControlId,
							recordingId: (recId as string) ?? null,
							urls: (recUrls as object) ?? {}
						}
					});

					// 2. Find original call log to get directions/numbers
					const callLog = await prisma.callLog.findFirst({
						where: { callId: callControlId, status: 'initiated' }
					});

					if (callLog) {
						// Resolve company by which number is the company's IVR (in CompanyPhoneNumber). The other is the contact.
						const toInfo = callLog.to
							? await getCompanyAndFlowByPhoneNumber(prisma, callLog.to)
							: null;
						const fromInfo = callLog.from
							? await getCompanyAndFlowByPhoneNumber(prisma, callLog.from)
							: null;

						const numberInfo = toInfo ?? fromInfo;
						const companyNumber = toInfo ? callLog.to : fromInfo ? callLog.from : null;
						const contactNumber = toInfo ? callLog.from : fromInfo ? callLog.to : null;
						const direction = (callLog.metadata as { direction?: string })?.direction ?? 'incoming';

						if (!numberInfo?.companyId || !contactNumber) {
							console.log('⚠️ Could not match call to a company: neither leg is a company number', {
								to: callLog.to,
								from: callLog.from
							});
						} else if (companyNumber && contactNumber) {
							// Find or create contact (caller) for this company
							let contact = await prisma.contact.findFirst({
								where: {
									companyId: numberInfo.companyId,
									phone: contactNumber
								}
							});

							if (!contact) {
								console.log('👤 Creating new contact for', contactNumber);
								contact = await prisma.contact.create({
									data: {
										companyId: numberInfo.companyId,
										phone: contactNumber,
										name: null
									}
								});
							}

							// Call tracking: get category from the number that received the call
							const companyNumberE164 = toE164(companyNumber);
							const numberRow = companyNumberE164
								? await prisma.companyPhoneNumber.findUnique({
										where: { phoneNumber: companyNumberE164 },
										select: { callTrackingCategoryId: true }
									})
								: null;

							// Find existing log created on hangup (so we add recording link instead of duplicating)
							const since = new Date(Date.now() - 10 * 60 * 1000); // 10 min window
							const existingLogs = await prisma.communicationLog.findMany({
								where: {
									companyId: numberInfo.companyId,
									type: 'voice',
									created: { gte: since }
								},
								orderBy: { created: 'desc' },
								take: 20
							});
							const existingLog = existingLogs.find(
								(l) => (l.metadata as Record<string, unknown>)?.call_control_id === callControlId
							);

							let transcript = '';
							let summary = '';
							let intent = '';
							let urgency = 'medium';
							let sentiment = '';
							let actionItems: string[] = [];

							const audioUrl = getFirstAudioUrl(recUrls);
							if (audioUrl) {
								try {
									const { transcribeAudio, analyzeCallLog } = await import('$lib/server/groq');
									transcript = await transcribeAudio(audioUrl);
									if (transcript) {
										const analysis = await analyzeCallLog(transcript);
										summary = analysis.summary;
										intent = analysis.intent;
										urgency = analysis.urgency;
										sentiment = analysis.sentiment;
										actionItems = analysis.actionItems;

										// FORWARD TO CLEARSKY ENGINE:
										// Now that we have the full transcript, send it to the AI Signals pipeline
										fetch('https://clearskysoftware.net/api/signals/telnyx/voice', {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({
												data: {
													event_type: 'call.transcription',
													payload: {
														from: contactNumber || 'Unknown',
														to: companyNumber || 'Unknown',
														call_control_id: callControlId,
														transcription: { text: transcript }
													}
												}
											})
										}).catch(err => console.error('[ClearSky Forwarding Error]', err));
									}
								} catch (err) {
									console.error('❌ Groq processing failed:', err);
								}
							}

							const recordingMetadata = {
								recording_urls: recUrls as Record<string, unknown>,
								recording_id: recId,
								call_control_id: callControlId,
								urgency,
								sentiment,
								intent: intent || undefined,
								actionItems,
								origin: direction
							};

							if (existingLog) {
								await prisma.communicationLog.update({
									where: { id: existingLog.id },
									data: {
										duration: recDurationSeconds > 0 ? recDurationSeconds : existingLog.duration,
										content: transcript || `Call recording available (${recDurationSeconds}s)`,
										summary: summary || null,
										metadata: {
											...((existingLog.metadata as Record<string, unknown>) || {}),
											...recordingMetadata
										}
									}
								});
								console.log('📝 Updated CommunicationLog with recording link', callControlId);
							} else {
								await prisma.communicationLog.create({
									data: {
										type: 'voice',
										direction: direction === 'incoming' ? 'inbound' : 'outbound',
										status: 'completed',
										source: contactNumber,
										destination: companyNumber,
										companyId: numberInfo.companyId,
										customerId: contact.id,
										callTrackingCategoryId: numberRow?.callTrackingCategoryId ?? undefined,
										duration: recDurationSeconds > 0 ? recDurationSeconds : null,
										content: transcript || `Call recording available (${recDurationSeconds}s)`,
										summary: summary || null,
										metadata: recordingMetadata
									}
								});
								console.log(
									'📝 Created CommunicationLog for call (no hangup log found)',
									callControlId
								);
							}
						}
					} else {
						console.log('⚠️ No initiated call log found for', callControlId);
					}
				}
				break;
			}

			default: {
				console.log('❓ Unhandled event:', eventType);
				break;
			}
		}

		// Always respond with a 200 OK to acknowledge receipt
		return json({ success: true });
	} catch (error) {
		console.error('Error processing webhook:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

async function playAudio(callControlId: string, message: string = ''): Promise<void> {
	try {
		await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${TELNYX_API_KEY}`
			},
			body: JSON.stringify({
				payload:
					message || 'Hello, this is an automated call. Please hold for an important message.',
				voice: 'female',
				language: 'en-US'
			})
		});
	} catch (error) {
		console.error('Error playing audio:', error);
	}
}

const TELNYX_HEADERS = {
	'Content-Type': 'application/json',
	Authorization: `Bearer ${TELNYX_API_KEY}`
};

async function telnyxPlayback(
	callControlId: string,
	audioUrl: string,
	clientState?: string
): Promise<void> {
	await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/playback_start`, {
		method: 'POST',
		headers: TELNYX_HEADERS,
		body: JSON.stringify({
			audio_url: audioUrl,
			...(clientState && { client_state: clientState })
		})
	});
}

async function telnyxHangup(callControlId: string): Promise<void> {
	await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
		method: 'POST',
		headers: TELNYX_HEADERS,
		body: JSON.stringify({})
	});
}

async function telnyxTransfer(callControlId: string, to: string): Promise<void> {
	await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`, {
		method: 'POST',
		headers: TELNYX_HEADERS,
		body: JSON.stringify({ to })
	});
}

// Log call events to database (Prisma)
async function logCallEvent(
	callId: string,
	status: string,
	payload: Record<string, unknown>
): Promise<void> {
	try {
		await prisma.callLog.create({
			data: {
				callId,
				status,
				to: (payload.to as string) ?? null,
				from: (payload.from as string) ?? null,
				duration: typeof payload.duration === 'number' ? payload.duration : null,
				metadata: payload as object
			}
		});
	} catch (dbError) {
		console.error('Error logging call event to database:', dbError);
	}
}

// Also add this for PUT, GET, OPTIONS methods for Telnyx webhook validation
export const GET: RequestHandler = () => json({ success: true });
export const PUT: RequestHandler = async (event) => {
	return await POST(event);
};
export const OPTIONS: RequestHandler = () => json({ success: true });
