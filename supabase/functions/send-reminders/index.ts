import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
)

async function sendPush(
    subscription: webpush.PushSubscription,
    payload: { title: string; body: string; data: Record<string, string> },
): Promise<boolean> {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload))
        return true
    } catch (err) {
        console.error('Push delivery failed:', err)
        return false
    }
}

Deno.serve(async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    let processed = 0

    // hearing reminders
    const { data: hearings, error: hearingErr } = await supabase
        .from('hearings')
        .select('id, title, hearing_date, hearing_time, case_id, user_id, cases(title), profiles(push_subscription)')
        .eq('hearing_date', tomorrowStr)
        .eq('reminder_24h_sent', false)
        .eq('is_deleted', false)

    if (hearingErr) {
        console.error('Failed to fetch hearings:', hearingErr)
    } else {
        for (const hearing of hearings ?? []) {
            const sub = (hearing as any).profiles?.push_subscription as webpush.PushSubscription | null
            if (!sub) continue

            const caseTitle = (hearing as any).cases?.title ?? 'Unknown case'
            const timeStr = hearing.hearing_time ?? 'Time TBC'

            const sent = await sendPush(sub, {
                title: 'Hearing tomorrow',
                body: `${caseTitle} — ${timeStr}`,
                data: { type: 'hearing_reminder', case_id: hearing.case_id },
            })

            if (sent) {
                await supabase
                    .from('hearings')
                    .update({ reminder_24h_sent: true })
                    .eq('id', hearing.id)

                await supabase.from('notification_logs').insert({
                    user_id: hearing.user_id,
                    case_id: hearing.case_id,
                    title: 'Hearing tomorrow',
                    body: `${caseTitle} — ${timeStr}`,
                    type: 'hearing_reminder',
                    reference_id: hearing.id,
                })

                processed++
            }
        }
    }

    // deadline reminders
    const { data: deadlines, error: deadlineErr } = await supabase
        .from('deadlines')
        .select('id, title, due_date, due_time, case_id, user_id, cases(title), profiles(push_subscription)')
        .eq('due_date', tomorrowStr)
        .eq('reminder_sent', false)
        .eq('is_completed', false)
        .eq('is_deleted', false)

    if (deadlineErr) {
        console.error('Failed to fetch deadlines:', deadlineErr)
    } else {
        for (const deadline of deadlines ?? []) {
            const sub = (deadline as any).profiles?.push_subscription as webpush.PushSubscription | null
            if (!sub) continue

            const caseTitle = (deadline as any).cases?.title ?? 'Unknown case'
            const timeStr = deadline.due_time ?? 'Time TBC'

            const sent = await sendPush(sub, {
                title: 'Deadline tomorrow',
                body: `${deadline.title} — ${caseTitle} — ${timeStr}`,
                data: { type: 'deadline_reminder', case_id: deadline.case_id },
            })

            if (sent) {
                await supabase
                    .from('deadlines')
                    .update({ reminder_sent: true })
                    .eq('id', deadline.id)

                await supabase.from('notification_logs').insert({
                    user_id: deadline.user_id,
                    case_id: deadline.case_id,
                    title: 'Deadline tomorrow',
                    body: `${deadline.title} — ${caseTitle} — ${timeStr}`,
                    type: 'deadline_reminder',
                    reference_id: deadline.id,
                })

                processed++
            }
        }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
        headers: { 'Content-Type': 'application/json' },
    })
})
