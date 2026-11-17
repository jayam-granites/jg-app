import { PgBoss } from 'pg-boss'
import { env } from '#/config/env'
import { logger } from '#/lib/logger'
import { expenseSchedulesService } from './expense-schedules.service'
import { taskRemindersService } from '../tasks/task-reminders.service'

const expenseScheduleQueue = 'generate-expense-schedules'
const taskReminderQueue = 'send-task-reminders'

export async function startScheduledWorkers() {
  const boss = new PgBoss(env.databaseUrl)
  boss.on('error', (error) => {
    logger.error({ err: error }, 'pg-boss error')
  })

  await boss.start()
  try {
    await boss.createQueue(expenseScheduleQueue)
    await boss.work(expenseScheduleQueue, async () => {
      const result = await expenseSchedulesService.processDueSchedules()
      logger.info(result, 'Processed due expense schedules')
    })
    await boss.schedule(expenseScheduleQueue, '0 0 * * *', {}, {
      tz: env.expenseScheduleTimeZone,
      missed: 'once',
    })

    if (env.whatsappConfigured) {
      await boss.createQueue(taskReminderQueue, {
        retryLimit: 3,
        retryDelay: 60,
        retryBackoff: true,
      })
      await boss.work(taskReminderQueue, async () => {
        const result = await taskRemindersService.sendDueReminders()
        logger.info(result, 'Processed task WhatsApp reminders')
      })
      await boss.schedule(taskReminderQueue, '0 9 * * *', {}, {
        tz: env.expenseScheduleTimeZone,
        missed: 'once',
      })
    } else {
      logger.warn(
        'WhatsApp task reminders are disabled; configure WHATSAPP_API_URL, WHATSAPP_API_KEY, and WHATSAPP_SESSION_ID',
      )
    }

    return boss
  } catch (error) {
    await boss.stop()
    throw error
  }
}
