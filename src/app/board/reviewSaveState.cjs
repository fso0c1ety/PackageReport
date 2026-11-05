// A save response may arrive while the user is already typing the next value.
// Persisted row state and the unsaved review input have different lifecycles.
function mergeReviewSaveResult(review, saved, columnId, requestedValue) {
  if (!review || review.id !== saved.id) return saved;
  const draft=review.values?.[columnId];
  return JSON.stringify(draft) === JSON.stringify(requestedValue)
    ? saved
    : {...saved,values:{...saved.values,[columnId]:draft}};
}
module.exports={mergeReviewSaveResult};
