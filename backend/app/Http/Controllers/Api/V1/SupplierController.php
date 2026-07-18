<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Supplier;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = Supplier::orderBy('name')->get();
        return response()->json(['success' => true, 'data' => $suppliers]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string|unique:suppliers,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier created',
            'data' => $supplier
        ], 201);
    }

    public function show(string $id)
    {
        return response()->json(['success' => true, 'data' => Supplier::findOrFail($id)]);
    }

    public function update(Request $request, string $id)
    {
        $supplier = Supplier::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'outstanding_balance' => 'sometimes|numeric|min:0',
        ]);
        $supplier->update($validated);
        return response()->json(['success' => true, 'data' => $supplier]);
    }

    public function destroy(string $id)
    {
        Supplier::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Supplier deleted']);
    }
}
