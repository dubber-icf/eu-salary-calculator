import { NextRequest, NextResponse } from 'next/server';
import { calculateSalary, storePayment, CalculationInput } from '@/lib/calculation';

export async function POST(request: NextRequest) {
  const body: CalculationInput = await request.json();
  
  try {
    const result = await calculateSalary(body);
    const paymentId = await storePayment(body, result);
    
    return NextResponse.json({
      success: true,
      paymentId,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
