import { env } from '#/config/env'
import { AppError } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { tasksRepository } from './tasks.repository'
import { sendWhatsAppText } from '../whatsapp/whatsapp-dispatcher'

function localDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((item) => item.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: env.expenseScheduleTimeZone,
  }).format(date)
}

export const taskRemindersService = {
  async sendDueReminders() {
    const now = new Date()
    const dateKey = localDateKey(now, env.expenseScheduleTimeZone)
    const reminderWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tasks = await tasksRepository.findDueForReminder(reminderWindowEnd)
    let sent = 0
    let failed = 0
    let skipped = 0
    const failures: unknown[] = []

    for (const task of tasks) {
      const recipients = new Map<string, string>()
      if (task.enquiry?.isActive && task.enquiry.mobile) {
        const digits = task.enquiry.mobile.replace(/\D/g, '')
        recipients.set(digits.length === 10 ? `91${digits}` : digits, task.enquiry.mobile)
      }
      if (task.resource?.isActive && task.resource.mobile) {
        const digits = task.resource.mobile.replace(/\D/g, '')
        recipients.set(digits.length === 10 ? `91${digits}` : digits, task.resource.mobile)
      }

      if (recipients.size === 0) {
        skipped += 1
        logger.warn({ taskId: task.id }, 'Skipped task reminder without a linked contact mobile')
        continue
      }

      const dueDate = new Date(task.dueDate)
      const dueMessage =
        dueDate > now
          ? `Reminder: ${task.title} is due ${formatDueDate(dueDate)}.`
          : `Reminder: ${task.title} is overdue (due ${formatDueDate(dueDate)}).`
      const text = [
        dueMessage,
        task.description,
        'Please follow up.',
      ]
        .filter(Boolean)
        .join('\n')

      for (const [recipientKey, mobile] of recipients) {
        try {
          await sendWhatsAppText(
            mobile,
            text,
            `task-${task.id}-${recipientKey}-${dateKey}`,
          )
          sent += 1
        } catch (error) {
          failed += 1
          failures.push(error)
          logger.error(
            { err: error, taskId: task.id },
            'Failed to send task WhatsApp reminder',
          )
        }
      }
    }

    if (failures.length > 0) {
      throw new AppError(
        `${failed} WhatsApp task reminder(s) failed; the scheduled job will retry`,
        502,
        'TASK_REMINDER_FAILED',
      )
    }

    return { tasks: tasks.length, sent, failed, skipped }
  },
}
