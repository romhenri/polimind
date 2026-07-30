import { ClassifyQuizData } from '@/types/quiz'

function fail(quizId: string, path: string, message: string): never {
  throw new Error(`[classify] ${quizId} at ${path}: ${message}`)
}

export function validateClassifyQuiz(quiz: ClassifyQuizData): void {
  const quizId = quiz?.id || 'unknown'

  if (!Array.isArray(quiz?.facets) || quiz.facets.length === 0) {
    fail(quizId, 'facets', 'must be a non-empty array')
  }
  if (!Array.isArray(quiz?.entities) || quiz.entities.length === 0) {
    fail(quizId, 'entities', 'must be a non-empty array')
  }

  const facetIds = new Set<string>()
  quiz.facets.forEach((facet, i) => {
    if (!facet.id) fail(quizId, `facets[${i}].id`, 'is required')
    if (facetIds.has(facet.id)) {
      fail(quizId, `facets[${i}].id`, `duplicate facet id "${facet.id}"`)
    }
    facetIds.add(facet.id)

    if (!Array.isArray(facet.groups) || facet.groups.length < 2) {
      fail(quizId, `facets[${i}].groups`, 'needs at least 2 groups')
    }

    const groupIds = new Set<string>()
    facet.groups.forEach((group, j) => {
      if (!group.id) fail(quizId, `facets[${i}].groups[${j}].id`, 'is required')
      if (groupIds.has(group.id)) {
        fail(
          quizId,
          `facets[${i}].groups[${j}].id`,
          `duplicate group id "${group.id}" in facet "${facet.id}"`
        )
      }
      groupIds.add(group.id)
    })
  })

  quiz.facets.forEach((facet, i) => {
    if (!facet.parent) return
    const parentFacet = quiz.facets.find((f) => f.id === facet.parent)
    if (!parentFacet) {
      fail(
        quizId,
        `facets[${i}].parent`,
        `references unknown facet "${facet.parent}"`
      )
    }
    const parentGroupIds = new Set(parentFacet.groups.map((g) => g.id))
    facet.groups.forEach((group, j) => {
      if (!group.parentGroup || !parentGroupIds.has(group.parentGroup)) {
        fail(
          quizId,
          `facets[${i}].groups[${j}].parentGroup`,
          `"${group.parentGroup}" is not a group of parent facet "${facet.parent}"`
        )
      }
    })
  })

  const facetsById = new Map(quiz.facets.map((f) => [f.id, f]))
  const entityIds = new Set<string>()
  quiz.entities.forEach((entity, i) => {
    if (!entity.id) fail(quizId, `entities[${i}].id`, 'is required')
    if (entityIds.has(entity.id)) {
      fail(quizId, `entities[${i}].id`, `duplicate entity id "${entity.id}"`)
    }
    entityIds.add(entity.id)

    const answerKeys = Object.keys(entity.answers ?? {})
    if (answerKeys.length === 0) {
      fail(quizId, `entities[${i}].answers`, 'must have at least one facet answer')
    }

    answerKeys.forEach((facetId) => {
      const facet = facetsById.get(facetId)
      if (!facet) {
        fail(
          quizId,
          `entities[${i}].answers.${facetId}`,
          `references unknown facet "${facetId}"`
        )
      }
      const groupId = entity.answers[facetId]
      if (!facet.groups.some((g) => g.id === groupId)) {
        fail(
          quizId,
          `entities[${i}].answers.${facetId}`,
          `"${groupId}" is not a group of facet "${facetId}"`
        )
      }
    })
  })
}
