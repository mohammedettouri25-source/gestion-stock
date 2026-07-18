<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Expense;
use App\Models\ExpenseCategory;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with('category');

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->has('from')) {
            $query->where('date', '>=', $request->from);
        }
        if ($request->has('to')) {
            $query->where('date', '<=', $request->to);
        }

        $expenses = $query->orderBy('date', 'desc')->paginate($request->get('per_page', 50));

        return response()->json(['success' => true, 'data' => $expenses]);
    }

    public function categories()
    {
        return response()->json([
            'success' => true,
            'data' => ExpenseCategory::all()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string|unique:expenses,id',
            'category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'date' => 'required|date',
        ]);

        $expense = Expense::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Expense recorded',
            'data' => $expense->load('category')
        ], 201);
    }

    public function show(string $id)
    {
        return response()->json(['success' => true, 'data' => Expense::with('category')->findOrFail($id)]);
    }

    public function destroy(string $id)
    {
        Expense::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Expense deleted']);
    }
}
