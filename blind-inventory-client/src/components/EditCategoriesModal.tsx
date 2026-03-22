import type { Category } from "../types/category"

type EditCategoriesModalProps = {
  isOpen: boolean
  categories: Category[]
  onClose: () => void
  onDeleteCategory: (categoryId: number) => Promise<void>
}

export default function EditCategoriesModal({
  isOpen,
  categories,
  onClose,
  onDeleteCategory,
}: EditCategoriesModalProps) {
  if (!isOpen) return null

  async function handleDelete(categoryId: number, categoryName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the category "${categoryName}"?`
    )

    if (!confirmed) return

    try {
      await onDeleteCategory(categoryId)
    } catch (error) {
      console.error(error)
      alert("Failed to delete category.")
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Categories
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Only categories with no items can be deleted.
          </p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => {
                  const canDelete = category.itemCount === 0

                  return (
                    <tr
                      key={category.id}
                      className="bg-gray-50 text-sm text-gray-700"
                    >
                      <td className="rounded-l-xl px-4 py-3 font-medium text-gray-900">
                        {category.name}
                      </td>
                      <td className="px-4 py-3">{category.itemCount}</td>
                      <td className="rounded-r-xl px-4 py-3">
                        <button
                          onClick={() =>
                            handleDelete(category.id, category.name)
                          }
                          disabled={!canDelete}
                          className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${
                            canDelete
                              ? "bg-red-600 hover:bg-red-700"
                              : "cursor-not-allowed bg-gray-300"
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}