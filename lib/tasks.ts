const leadingListMarker = /^\s*(?:[-*•]+|\d+[.)])\s*/

export function parseTasks(taskDump: string) {
  return taskDump
    .split(/\r?\n|[,;•]+/)
    .map((task) => task.replace(leadingListMarker, '').trim())
    .filter(Boolean)
}

function comparableTask(task: string) {
  return task.toLocaleLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function tasksAreEquivalent(left: string, right: string) {
  const comparableLeft = comparableTask(left)
  const comparableRight = comparableTask(right)
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

export function getTadpoles(taskDump: string, chosenTask: string | null, frogText?: string) {
  const tasks = parseTasks(taskDump)
  const selectedTask = chosenTask || frogText
  if (!selectedTask) return []

  let removedFrog = false

  const tadpoles = tasks.filter((task) => {
    if (removedFrog) return true

    const isFrog = tasksAreEquivalent(task, selectedTask)
    if (isFrog) removedFrog = true
    return !isFrog
  })

  // Old records sometimes stored only a generated first step, not the
  // selected source task. Avoid calling the whole dump "tadpoles" when the
  // frog cannot be identified with confidence.
  return removedFrog ? tadpoles : []
}
