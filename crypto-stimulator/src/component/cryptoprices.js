import React, { useEffect, useState } from 'react';
import axios from 'axios';

const coins = ['bitcoin', 'ethereum', 'dogecoin'];

const CryptoPrices = () => {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(
            ','
          )}&vs_currencies=usd`
        );
        setPrices(res.data);
      } catch (err) {
        console.error('Error fetching prices:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
      {coins.map((coin) => (
        <div
          key={coin}
          className="bg-white p-4 rounded-lg shadow-md text-center"
        >
          <h2 className="text-lg font-bold capitalize">{coin}</h2>
          <p className="text-green-600 text-xl font-semibold">
            ${prices[coin]?.usd ?? '...'}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CryptoPrices;