import { NewBorrowForm, type BorrowSearchParams } from './NewBorrowForm'

export default async function NewBorrowPage({
  searchParams,
}: {
  searchParams: Promise<BorrowSearchParams>
}) {
  return <NewBorrowForm query={await searchParams} />
}
