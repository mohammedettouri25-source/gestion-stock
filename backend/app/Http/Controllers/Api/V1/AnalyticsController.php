<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Delivery;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();
        $monthStart = Carbon::now()->startOfMonth();

        // Sales aggregation
        $todaySales = Order::whereDate('date', $today)->sum('total_amount');
        $weeklySales = Order::where('date', '>=', $weekStart)->sum('total_amount');
        $monthlySales = Order::where('date', '>=', $monthStart)->sum('total_amount');

        // Profit calculation (selling - purchase cost)
        $monthlyProfit = OrderItem::whereHas('order', function($q) use ($monthStart) {
            $q->where('date', '>=', $monthStart);
        })->selectRaw('SUM((selling_price - purchase_price) * quantity) as profit')
          ->first()->profit ?? 0;

        // Expenses this month
        $monthlyExpenses = Expense::where('date', '>=', $monthStart->toDateString())->sum('amount');

        // Pending orders (with deliveries)
        $pendingOrders = Delivery::where('status', 'pending')->count();

        // Low stock count
        $lowStockCount = Product::whereColumn('current_stock', '<=', 'min_stock')->count();

        // Best sellers this month
        $bestSellers = OrderItem::whereHas('order', function($q) use ($monthStart) {
            $q->where('date', '>=', $monthStart);
        })
        ->select('product_id', 'name', 'sku',
            DB::raw('SUM(quantity) as total_sold'),
            DB::raw('SUM(selling_price * quantity) as total_revenue'),
            DB::raw('SUM((selling_price - purchase_price) * quantity) as total_profit')
        )
        ->groupBy('product_id', 'name', 'sku')
        ->orderBy('total_sold', 'desc')
        ->limit(10)
        ->get();

        // Weekly performance chart data (last 7 days)
        $weeklyChart = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::today()->subDays($i);
            $daySales = Order::whereDate('date', $day)->sum('total_amount');
            $dayProfit = OrderItem::whereHas('order', fn($q) => $q->whereDate('date', $day))
                ->selectRaw('SUM((selling_price - purchase_price) * quantity) as profit')
                ->first()->profit ?? 0;
            $weeklyChart[] = [
                'date' => $day->format('D'),
                'sales' => round($daySales, 2),
                'profit' => round($dayProfit, 2),
            ];
        }

        // Inventory valuation
        $inventoryValuation = Product::selectRaw('SUM(purchase_price * current_stock) as cost_value, SUM(selling_price * current_stock) as sell_value')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'today_sales' => round($todaySales, 2),
                'weekly_sales' => round($weeklySales, 2),
                'monthly_sales' => round($monthlySales, 2),
                'monthly_profit' => round($monthlyProfit, 2),
                'monthly_expenses' => round($monthlyExpenses, 2),
                'net_profit' => round($monthlyProfit - $monthlyExpenses, 2),
                'pending_orders' => $pendingOrders,
                'low_stock_count' => $lowStockCount,
                'best_sellers' => $bestSellers,
                'weekly_chart' => $weeklyChart,
                'inventory_cost_value' => round($inventoryValuation->cost_value ?? 0, 2),
                'inventory_sell_value' => round($inventoryValuation->sell_value ?? 0, 2),
            ]
        ]);
    }

    public function profitLoss(Request $request)
    {
        $from = $request->get('from', Carbon::now()->startOfMonth()->toDateString());
        $to = $request->get('to', Carbon::now()->toDateString());

        $totalRevenue = Order::whereBetween(DB::raw('DATE(date)'), [$from, $to])->sum('total_amount');

        $totalCogs = OrderItem::whereHas('order', function($q) use ($from, $to) {
            $q->whereBetween(DB::raw('DATE(date)'), [$from, $to]);
        })->selectRaw('SUM(purchase_price * quantity) as cogs')->first()->cogs ?? 0;

        $grossProfit = $totalRevenue - $totalCogs;

        $totalExpenses = Expense::whereBetween('date', [$from, $to])->sum('amount');

        $netProfit = $grossProfit - $totalExpenses;

        $expenseBreakdown = Expense::with('category')
            ->whereBetween('date', [$from, $to])
            ->select('category_id', DB::raw('SUM(amount) as total'))
            ->groupBy('category_id')
            ->with('category')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'period' => ['from' => $from, 'to' => $to],
                'total_revenue' => round($totalRevenue, 2),
                'total_cogs' => round($totalCogs, 2),
                'gross_profit' => round($grossProfit, 2),
                'total_expenses' => round($totalExpenses, 2),
                'net_profit' => round($netProfit, 2),
                'expense_breakdown' => $expenseBreakdown,
            ]
        ]);
    }

    public function inventoryReport(Request $request)
    {
        $products = Product::with(['category', 'brand'])
            ->select('id', 'name', 'sku', 'purchase_price', 'selling_price',
                     'current_stock', 'min_stock', 'category_id', 'brand_id',
                     DB::raw('(purchase_price * current_stock) as cost_value'),
                     DB::raw('(selling_price * current_stock) as sell_value'),
                     DB::raw('((selling_price - purchase_price) * current_stock) as potential_profit')
            )
            ->orderBy('current_stock')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
            'summary' => [
                'total_products' => $products->count(),
                'low_stock_count' => $products->filter(fn($p) => $p->current_stock <= $p->min_stock)->count(),
                'total_cost_value' => round($products->sum('cost_value'), 2),
                'total_sell_value' => round($products->sum('sell_value'), 2),
            ]
        ]);
    }
}
