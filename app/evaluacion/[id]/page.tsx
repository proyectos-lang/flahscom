import { redirect } from "next/navigation"

// Short alias route: /evaluacion/[id] -> /evaluacion-externa/[id]
// This shorter URL is easier to share via WhatsApp / SMS.
export default async function EvaluacionShortRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/evaluacion-externa/${id}`)
}
