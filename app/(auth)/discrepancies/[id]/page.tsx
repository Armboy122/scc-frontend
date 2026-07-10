import { DiscrepancyDetailContent } from './DiscrepancyDetailContent'

export default async function DiscrepancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DiscrepancyDetailContent id={id} />
}
