'use server';

import { NextResponse } from 'next/server';
import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
import { generateAIAnswer, ExpenseRecord } from '@/lib/ai';

export async function POST(request: Request) {
	try {
		const user = await checkUser();
		if (!user) {
			return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { question } = await request.json();
		if (!question || typeof question !== 'string') {
			return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
		}

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const expenses = await db.record.findMany({
			where: {
				userId: user.clerkUserId,
				createdAt: {
					gte: thirtyDaysAgo,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: 50,
		});

		const expenseData: ExpenseRecord[] = expenses.map((expense) => ({
			id: expense.id,
			amount: expense.amount,
			category: expense.category || 'Other',
			description: expense.text,
			date: expense.createdAt.toISOString(),
		}));

		const answer = await generateAIAnswer(question, expenseData);
		return NextResponse.json({ answer });
	} catch (error) {
		console.error('Error in /api/ai/answer:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Unknown error generating answer',
			},
			{ status: 500 }
		);
	}
}


