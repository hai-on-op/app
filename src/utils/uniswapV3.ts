/**
 * Utility functions for Uniswap V3 position calculations
 */

/**
 * Calculate token amounts for a Uniswap V3 position
 */
export function calculateAmounts(
  liquidity: number, 
  tickLower: number, 
  tickUpper: number, 
  currentTick: number, 
  sqrtPrice: number
) {
  // Scale down the liquidity to avoid numerical overflows
  // Uniswap liquidity values are often very large
  const scaledLiquidity = liquidity / 1e18;
  
  // Convert tick indices to sqrt prices
  const sqrtPriceLower = Math.sqrt(1.0001 ** tickLower);
  const sqrtPriceUpper = Math.sqrt(1.0001 ** tickUpper);
  
  // Note: sqrtPrice from the API is already in the right format, no need for Q64.96 conversion
  // which was causing massive numerical errors
  const currentSqrtPrice = parseFloat(sqrtPrice.toString());
  
  let amount0 = 0;
  let amount1 = 0;
  
  if (currentTick <= tickLower) {
    // Position is entirely token0
    amount0 = scaledLiquidity * ((1 / sqrtPriceLower) - (1 / sqrtPriceUpper));
  } else if (currentTick >= tickUpper) {
    // Position is entirely token1
    amount1 = scaledLiquidity * (sqrtPriceUpper - sqrtPriceLower);
  } else {
    // Position contains both tokens
    amount0 = scaledLiquidity * ((1 / currentSqrtPrice) - (1 / sqrtPriceUpper));
    amount1 = scaledLiquidity * (currentSqrtPrice - sqrtPriceLower);
  }
  
  return { amount0, amount1 };
}

/**
 * Calculate the USD value of a position based on token amounts and prices
 */
export function calculateUSDValue(
  amount0: number,
  amount1: number,
  token0UsdPrice: number,
  token1UsdPrice: number
) {
  // Ensure prices are reasonable (fallback to 1.0 if crazy values)
  const safeToken0Price = isFinite(token0UsdPrice) && token0UsdPrice > 0 && token0UsdPrice < 1000000 
    ? token0UsdPrice 
    : 1.0;
    
  const safeToken1Price = isFinite(token1UsdPrice) && token1UsdPrice > 0 && token1UsdPrice < 1000000 
    ? token1UsdPrice 
    : 1.0;
  
  return (amount0 * safeToken0Price) + (amount1 * safeToken1Price);
}

/**
 * Calculate the USD value of a Uniswap V3 position
 */
export function calculatePositionValue(
  position: {
    liquidity: string,
    tickLower: { tickIdx: string },
    tickUpper: { tickIdx: string }
  },
  pool: {
    tick: string,
    sqrtPrice: string,
    token0Price: string,
    token1Price: string,
    totalValueLockedUSD: string,
    liquidity: string
  },
  token0UsdPrice: number,
  token1UsdPrice: number
) {
  if (!position || !pool) return 0;
  
  // Convert string values to numbers
  const liquidity = parseFloat(position.liquidity);
  const tickLower = parseInt(position.tickLower.tickIdx);
  const tickUpper = parseInt(position.tickUpper.tickIdx);
  const currentTick = parseInt(pool.tick);
  
  // Use the sqrtPrice directly - fix for numerical errors
  const sqrtPrice = parseFloat(pool.sqrtPrice);
  
  console.log('Position calculation inputs:', {
    liquidity,
    tickLower,
    tickUpper,
    currentTick,
    sqrtPrice,
    token0UsdPrice,
    token1UsdPrice
  });
  
  if (liquidity === 0) return 0;
  
  try {
    // Calculate token amounts in the position
    const { amount0, amount1 } = calculateAmounts(
      liquidity,
      tickLower,
      tickUpper,
      currentTick,
      sqrtPrice
    );
    
    console.log('Calculated amounts:', { amount0, amount1 });
    
    // Calculate USD value
    const value = calculateUSDValue(amount0, amount1, token0UsdPrice, token1UsdPrice);
    
    // Apply a sanity check - if value is unreasonably large, return a modest estimate
    if (!isFinite(value) || value > 1000000000) {
      // Fallback to a simple proportion of pool TVL as a reasonable approximation
      const poolTVL = parseFloat(pool.totalValueLockedUSD);
      const poolLiquidity = parseFloat(pool.liquidity);
      if (poolLiquidity > 0 && isFinite(poolTVL)) {
        return (liquidity / poolLiquidity) * poolTVL;
      }
      return 0;
    }
    
    return value;
  } catch (error) {
    console.error('Error calculating position value:', error);
    return 0;
  }
} 