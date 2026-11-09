/**
 * The four product-work stages and the skills that drive them (the README's skill map).
 * Documents are placed into a stage by their name; a project's progress is the
 * furthest stage that already holds a document.
 */

/** One skill a stage offers. `skill` is its folder under `.agents/skills/`. */
export interface StageSkill {
  readonly label: string
  readonly skill: string
}

/** One stage of product work. */
export interface Stage {
  readonly id: 'define' | 'research' | 'requirements' | 'review'
  readonly title: string
  readonly skills: readonly StageSkill[]
  /** Name fragments that place a document here, checked from the last stage backwards. */
  readonly keywords: readonly string[]
}

export const STAGES: readonly Stage[] = [
  {
    id: 'define', title: '启动与定义',
    skills: [{ label: '项目启动', skill: 'aipm-project-initiation' }, { label: '问题定义', skill: 'aipm-problem-definition' }],
    keywords: ['启动', '问题', '背景', '目标', '定义', '立项'],
  },
  {
    id: 'research', title: '研究与分析',
    skills: [
      { label: '用户研究', skill: 'aipm-user-research' }, { label: '用户分层', skill: 'aipm-user-segmentation' },
      { label: '产品拆解', skill: 'aipm-product-teardown' }, { label: '竞品分析', skill: 'aipm-competitive-analysis' },
    ],
    keywords: ['访谈', '调研', '研究', '用户', '分层', '画像', '竞品', '拆解', '分析'],
  },
  {
    id: 'requirements', title: '需求与范围',
    skills: [{ label: '需求管理', skill: 'aipm-requirements-management' }, { label: '优先级与范围', skill: 'aipm-prioritization-scope' }],
    keywords: ['需求', '优先级', '范围', '功能清单', 'mvp', 'MVP'],
  },
  {
    id: 'review', title: '文档与评审',
    skills: [{ label: '用户旅程与协作', skill: 'aipm-journey-collaboration' }, { label: '需求文档编写与评审', skill: 'aipm-prd-writing-review' }],
    keywords: ['prd', 'PRD', '旅程', '评审', '需求文档'],
  },
]

/**
 * Place one document into a stage by its name.
 * @param file - document file name.
 * @returns stage index, or -1 when no keyword matches.
 */
export function stageOf(file: string): number {
  for (let index = STAGES.length - 1; index >= 0; index--) {
    if (STAGES[index]?.keywords.some(word => file.includes(word)) === true) return index
  }
  return -1
}

/** Where one stage stands for a project. */
export type StageState = 'done' | 'current' | 'todo'

/**
 * Work out each stage's state and documents.
 * @param documents - the project's document names.
 * @returns per stage: its state and documents; plus documents no stage claimed.
 */
export function stageProgress(documents: readonly string[]): {
  readonly stages: readonly { readonly stage: Stage; readonly state: StageState; readonly documents: readonly string[] }[]
  readonly current: number
  readonly other: readonly string[]
} {
  const buckets: string[][] = STAGES.map(() => [])
  const other: string[] = []
  for (const file of documents) {
    const index = stageOf(file)
    if (index < 0) other.push(file)
    else buckets[index]?.push(file)
  }
  const furthest = buckets.reduce((last, files, index) => files.length > 0 ? index : last, -1)
  // A fresh project starts at the first stage.
  const current = Math.max(0, furthest)
  return {
    stages: STAGES.map((stage, index) => ({
      stage,
      state: index < current ? 'done' : index === current ? 'current' : 'todo',
      documents: buckets[index] ?? [],
    })),
    current,
    other,
  }
}

/**
 * Draft prompt that starts a conversation with one skill.
 * @param stage - target stage.
 * @param skill - chosen skill.
 * @returns the composer draft.
 */
export function skillPrompt(stage: Stage, skill: StageSkill): string {
  return `使用「${skill.label}」技能（${skill.skill}），推进这个项目的「${stage.title}」阶段。先问我需要补充的信息，再一起整理成文档。`
}

/**
 * Display name of a document without its extension.
 * @param file - file name.
 * @returns name without `.md` / `.txt`.
 */
export function plainName(file: string): string {
  return file.replace(/\.(md|txt)$/iu, '')
}

/**
 * A server preview without the document's own heading at the front.
 * @param file - file name.
 * @param preview - first characters of the document.
 * @returns preview text that starts after the title.
 */
export function previewOf(file: string, preview: string): string {
  const name = plainName(file)
  return preview.startsWith(name) ? preview.slice(name.length).trimStart() : preview
}
