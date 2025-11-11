'use server';

import { NextResponse } from 'next/server';
import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
import { generateExpenseInsights, ExpenseRecord } from '@/lib/ai';

export async function GET() {
	try {
		const user = await checkUser();
		if (!user) {
			return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
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

		if (expenses.length === 0) {
			return NextResponse.json([
				{
					id: 'welcome-1',
					type: 'info',
					title: 'Welcome to ExpenseTracker AI!',
					message:
						'Start adding your expenses to get personalized AI insights about your spending patterns.',
					action: 'Add your first expense',
					confidence: 1.0,
				},
				{
					id: 'welcome-2',
					type: 'tip',
					title: 'Track Regularly',
					message:
						'For best results, try to log expenses daily. This helps our AI provide more accurate insights.',
					action: 'Set daily reminders',
					confidence: 1.0,
				},
			]);
		}

		const expenseData: ExpenseRecord[] = expenses.map((expense) => ({
			id: expense.id,
			amount: expense.amount,
			category: expense.category || 'Other',
			description: expense.text,
			date: expense.createdAt.toISOString(),
		}));

		const insights = await generateExpenseInsights(expenseData);
		return NextResponse.json(insights);
	} catch (error) {
		console.error('Error in /api/ai/insights:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Unknown error generating insights',
			},
			{ status: 500 }
		);
	}
}


