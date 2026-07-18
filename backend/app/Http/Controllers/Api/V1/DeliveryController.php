<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Delivery;

class DeliveryController extends Controller
{
    public function index(Request $request)
    {
        $query = Delivery::with('order');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->paginate(50),
            'summary' => [
                'total_pending' => Delivery::where('status', 'pending')->count(),
                'total_shipped' => Delivery::where('status', 'shipped')->count(),
                'total_delivered' => Delivery::where('status', 'delivered')->count(),
                'total_cancelled' => Delivery::where('status', 'cancelled')->count(),
                'total_fee_income' => Delivery::whereIn('status', ['delivered'])->sum('fee'),
                'total_fee_expense' => Delivery::sum('fee'),
            ]
        ]);
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:pending,shipped,delivered,cancelled',
            'tracking_number' => 'nullable|string',
        ]);

        $delivery = Delivery::findOrFail($id);
        $delivery->update([
            'status' => $request->status,
            'tracking_number' => $request->tracking_number ?? $delivery->tracking_number,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Delivery status updated',
            'data' => $delivery->load('order')
        ]);
    }
}
