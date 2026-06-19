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

export function getTadpoles(taskDump: string, chosenTask: string | null) {
  const tasks = parseTasks(taskDump)
  if (!chosenTask) return tasks

  const chosen = comparableTask(chosenTask)
  let removedFrog = false

  return tasks.filter((task) => {
    if (removedFrog) return true

    const candidate = comparableTask(task)
    const isFrog = candidate === chosen || candidate.includes(chosen) || chosen.includes(candidate)
    if (isFrog) removedFrog = true
    return !isFrog
  })
}
