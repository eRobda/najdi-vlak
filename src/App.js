import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './index.css';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrainData = async () => {
      try {
        const response = await fetch("https://mapy.spravazeleznic.cz/serverside/request2.php?module=Layers\\OsVlaky&&action=load");
        const data = await response.json();
        if (data.success) {
          setTrains(data.result);
        } else {
          throw new Error('Data nejsou k dispozici');
        }
      } catch (error) {
        console.error('Chyba při načítání dat o vlacích:', error);
        setError('Nepodařilo se načíst data o vlacích. Zkuste to prosím později.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrainData();
  }, []);

  const getDelayColor = (delay) => {
    if (delay === 0) return "bg-green-500";
    if (delay > 0 && delay <= 10) return "bg-lime-500";
    if (delay > 10 && delay <= 30) return "bg-orange-500";
    if (delay > 30) return "bg-red-500";
    return "bg-gray-300";
  };

  const parseDelay = (delayStr) => {
    if (!delayStr || !delayStr.includes('min')) return 0;
    const delay = parseInt(delayStr.split(' ')[0], 10);
    return isNaN(delay) ? 0 : delay;
  };

  const filteredTrains = trains.filter(train => {
    const combinedTtTn = `${train.properties.tt} ${train.properties.tn}`.toLowerCase();
    
    return (
      train.properties.fn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      train.properties.ln.toLowerCase().includes(searchTerm.toLowerCase()) ||
      train.properties.na.toLowerCase().includes(searchTerm.toLowerCase()) ||
      train.properties.tn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      combinedTtTn.includes(searchTerm.toLowerCase())
    );
  });
  

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">Načítání...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex justify-center items-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="relative mb-4">
          <input
            type="text"
            className="w-full p-3 rounded-lg shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Hledat vlaky..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredTrains.length > 0 ? (
          <ul className="bg-white rounded-lg shadow-md">
            {filteredTrains.map((train, index) => {
              const delayStr = train.properties.pde;
              const delay = parseDelay(delayStr);
              const delayColor = getDelayColor(delay);

              return (
                <li
                  key={train.id || index}
                  className={`p-3 border-b border-gray-200 last:border-none hover:bg-blue-100 cursor-pointer flex justify-between items-center`}
                >
                  <Link to={`/train/${encodeURIComponent(train.id)}`} className="w-full">
                    <div>
                      <div className="text-lg font-bold">
                        {`${train.properties.na} ${train.properties.tt} ${train.properties.tn}`}
                      </div>
                      <div className="text-gray-600">
                        Z: {train.properties.fn} → Do: {train.properties.ln}
                      </div>
                    </div>
                    <div className={`text-white p-2 rounded-lg ${delayColor}`}>
                      {delayStr || "Na čas"}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-gray-500">Žádné vlaky nenalezeny.</div>
        )}
      </div>
    </div>
  );
}

export default App;
