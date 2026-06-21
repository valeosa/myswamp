const leadingListMarker = /^\s*(?:[-*•]+|\d+[.)])\s*/

export function parseTasks(taskDump: string) {
  return taskDump
    .split(/\r?\n|[,;•]+/)
    .map((task) => task.replace(leadingListMarker, '').trim())
    .filter(Boolean)
}

export function taskKey(task: string) {
  return task.toLocaleLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function tasksAreEquivalent(left: string, right: string) {
  const comparableLeft = taskKey(left)
  const comparableRight = taskKey(right)
  if (!comparableLeft || !comparableRight) return false
  return comparableLeft === comparableRight
    || comparableLeft.includes(comparableRight)
    || comparableRight.includes(comparableLeft)
}

export function getDisplayFrog(taskDump: string, chosenTask: string | null, frogText: string) {
  if (chosenTask) return chosenTask

  const tasks = parseTasks(taskDump)
  return tasks.length === 1 ? tasks[0] : frogText
}

export function getTadpoles(
  taskDump: string,
  chosenTask: string | null,
  frogText?: string,
  chosenPosition?: number | null,
) {
  return getTadpoleItems(taskDump, chosenTask, frogText, chosenPosition).map((item) => item.taskText)
}

export function getTadpoleItems(
  taskDump: string,
  chosenTask: string | null,
  frogText?: string,
  chosenPosition?: number | null,
) {
  const tasks = parseTasks(taskDump)
  const selectedTask = chosenTask || frogText
  if (!selectedTask) return []

  if (typeof chosenPosition === 'number' && chosenPosition >= 0 && chosenPosition < tasks.length) {
    return tasks.flatMap((task, position) => position === chosenPosition
      ? []
      : [{ position, taskText: task, taskKey: taskKey(task) || task.toLocaleLowerCase() }])
  }

  let removedFrog = false

  const tadpoles = tasks.flatMap((task, position) => {
    const item = { position, taskText: task, taskKey: taskKey(task) || task.toLocaleLowerCase() }
    if (removedFrog) return [item]

    const isFrog = tasksAreEquivalent(task, selectedTask)
    if (isFrog) {
      removedFrog = true
      return []
    }
    return [item]
  })

  // Old records sometimes stored only a generated first step, not the
  // selected source task. Avoid calling the whole dump "tadpoles" when the
  // frog cannot be identified with confidence.
  return removedFrog ? tadpoles : []
}
