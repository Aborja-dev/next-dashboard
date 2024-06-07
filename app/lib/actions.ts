'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  await queryInvoice(async () => {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `
  }, 'create')
  revalidatePath('/dashboard/invoices');

}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;
 
  await queryInvoice(async () => {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  }, 'update')
 
  revalidatePath('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await queryInvoice(async () => {
    throw new Error('Failed to Delete Invoice');
    await sql`DELETE FROM customers WHERE id = ${id}`
  }, 'delete')
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

const queryInvoice = async (execQuery: () => Promise<void>, type: 'create' | 'read' | 'update' | 'delete') => {
  try {
    await execQuery();
    redirect('/dashboard/invoices');
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error(`Failed to ${type} invoice`);
  }
}