import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './index.css';

function TrainDetail() {
    const { id } = useParams(); // Získání ID vlaku z URL
    const [train, setTrain] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [position, setPosition] = useState(null);

    const markerIcon = new Icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25613.png',
        iconSize: [35, 35],
        iconAnchor: [17, 35],
        popupAnchor: [-3, -76]
    });

    const convertJTSKToWGS = async (yjtsk, xjtsk, zbpv = 1) => {
        try {
            const FormData = require('form-data');
            let data = new FormData();
            data.append('yjtsk', yjtsk);
            data.append('xjtsk', xjtsk);
            data.append('zbpv', zbpv);
            data.append('jtsk', '');

            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://corsproxy.io/?https://www.estudanky.eu/prevody/jtsk.php',
                data: data
            };

            const response = await axios.request(config);
            const html = response.data;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const latLen = doc.querySelectorAll("td")[7].innerHTML;
            const lat = latLen.split("=")[1].split('<')[0];
            const lon = latLen.split("=")[2].split('<')[0];

            return { lat, lon };
        } catch (error) {
            console.error('Error converting coordinates:', error);
            return null;
        }
    };

    const convertToDecimalDegrees = (latStr, lonStr) => {
        const parseDMS = (dmsString) => {
            const regex = /(\d+)°(\d+)'([\d.]+)"([NSEW])/;
            const matches = dmsString.match(regex);

            if (!matches) {
                throw new Error('Invalid DMS format');
            }

            const degrees = parseInt(matches[1], 10);
            const minutes = parseInt(matches[2], 10);
            const seconds = parseFloat(matches[3]);
            const direction = matches[4];

            let decimal = degrees + minutes / 60 + seconds / 3600;
            if (direction === 'S' || direction === 'W') {
                decimal = -decimal;
            }

            return decimal;
        };

        const lat = parseDMS(latStr);
        const lon = parseDMS(lonStr);
        return [lat, lon];
    };

    const fetchTrainDetail = async () => {
        try {
            const response = await fetch("https://mapy.spravazeleznic.cz/serverside/request2.php?module=Layers\\OsVlaky&&action=load");
            const data = await response.json();
            if (data.success) {
                const trainDetail = data.result.find(t => t.id === id);
                setTrain(trainDetail);

                const { coordinates } = trainDetail.geometry;
                const yjtsk = coordinates[0];
                const xjtsk = coordinates[1];

                const converted = await convertJTSKToWGS(yjtsk, xjtsk);
                if (converted) {
                    const latLng = convertToDecimalDegrees(converted.lat, converted.lon);
                    setPosition(latLng);
                } else {
                    throw new Error('Nepodařilo se převést souřadnice.');
                }
            } else {
                throw new Error('Data nejsou k dispozici');
            }
        } catch (error) {
            console.error('Chyba při načítání detailu vlaku:', error);
            setError('Nepodařilo se načíst detail vlaku. Zkuste to prosím později.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainDetail();

        const interval = setInterval(() => {
            fetchTrainDetail();
        }, 30000);

        return () => clearInterval(interval);
    }, [id]);

    if (loading) {
        return <div className="min-h-screen flex justify-center items-center">Načítání...</div>;
    }

    if (error) {
        return <div className="min-h-screen flex justify-center items-center text-red-500">{error}</div>;
    }

    if (!train) {
        return <div className="min-h-screen flex justify-center items-center text-gray-500">Detail vlaku nenalezen.</div>;
    }

    // Custom component to center the map when position changes
    function CenterMap({ position }) {
        const map = useMap();
        useEffect(() => {
            if (position) {
                map.setView(position, map.getZoom());
            }
        }, [map, position]);
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h1 className="text-2xl font-bold mb-2">{train.properties.na + " " + train.properties.tt + " " + train.properties.tn}</h1>
                    <p className="text-gray-600 mb-2">Z: {train.properties.fn}</p>
                    <p className="text-gray-600 mb-2">K: {train.properties.ln}</p>
                    <hr className='mt-[-0.25rem] mb-[0.25rem]'></hr>
                    <p className="text-gray-600 mb-2">Potvrzená stanice: {train.properties.cna}</p>
                    <p className="text-gray-600 mb-2">Pravidelný odjezd: {train.properties.cp}</p>
                    <p className="text-gray-600 mb-2">Skutečný odjezd: {train.properties.cr}</p>
                    <hr className='mt-[-0.25rem] mb-[0.25rem]'></hr>
                    <p className="text-gray-600 mb-2">Následující stanice: {train.properties.nsn}</p>
                    <p className="text-gray-600 mb-2">Pravidelný příjezd: {train.properties.nst}</p>
                    <p className="text-gray-600 mb-2">Předpokládaný příjezd: {train.properties.nsp}</p>
                    <hr className='mt-[-0.25rem] mb-[0.25rem]'></hr>
                    <p className="text-gray-600 mb-2">Zpoždění: {train.properties.pde || "Na čas"}</p>
                    <p className="text-gray-600 mb-2">Číslo vlaku: {train.properties.tn}</p>
                </div>

                {/* Mapa */}
                {position && (
                    <div className="mt-4">
                        <MapContainer center={position} zoom={13} style={{ height: '400px', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <Marker position={position} icon={markerIcon}>
                                <Popup>
                                    Vlak se nachází zde.
                                </Popup>
                            </Marker>
                            <CenterMap position={position} />
                        </MapContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TrainDetail;
