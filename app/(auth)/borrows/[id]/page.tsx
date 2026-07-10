import { BorrowDetailContent } from './BorrowDetailContent'

export default async function BorrowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <BorrowDetailContent id={id} />
}
