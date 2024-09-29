import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {Icon} from 'leaflet'
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './index.css';

function TrainDetail() {
    const { id } = useParams(); // Získání ID vlaku z URL
    const [train, setTrain] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [position, setPosition] = useState(null);

    const markerIcon = new Icon ({
        iconUrl : 'https://cdn-icons-png.flaticon.com/512/25/25613.png',
        iconSize : [35, 35], // size of the icon
        iconAnchor : [25, 35], // point of the icon which will correspond to marker's location
        popupAnchor : [-3, -76] // point from which the popup should open relative to the iconAnchor
      })

    // Coordinate conversion function (JTSK -> WGS)
    const convertJTSKToWGS = async (yjtsk, xjtsk, zbpv = 1) => {
        try {
            const FormData = require('form-data');
            let data = new FormData();
            data.append('yjtsk', yjtsk);
            data.append('xjtsk', xjtsk);
            data.append('zbpv', zbpv);
            data.append('jtsk', '');

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://corsproxy.io/?https://www.estudanky.eu/prevody/jtsk.php',
                data: data
            };

            const response = await axios.request(config);
            const html = response.data;

            // Create a new DOM parser to parse the HTML response string
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Use querySelector to find the elements that contain the coordinates
            const latLen = doc.querySelectorAll("td")[7].innerHTML;

            const lat = latLen.split("=")[1].split('<')[0];
            console.log(lat)
            const lon = latLen.split("=")[2].split('<')[0];
            console.log(lon)

            return { lat, lon }
        } catch (error) {
            console.error('Error converting coordinates:', error);
            return null;
        }
    };

    // Convert degrees, minutes, seconds (DMS) format to decimal degrees
    const convertToDecimalDegrees = (latStr, lonStr) => {
        const parseDMS = (dmsString) => {
            console.log(dmsString)
            // Regular expression to extract the degrees, minutes, seconds, and direction
            const regex = /(\d+)°(\d+)'([\d.]+)"([NSEW])/;
            const matches = dmsString.match(regex);

            if (!matches) {
                throw new Error('Invalid DMS format');
            }

            const degrees = parseInt(matches[1], 10);
            const minutes = parseInt(matches[2], 10);
            const seconds = parseFloat(matches[3]);
            const direction = matches[4];

            // Convert DMS to decimal
            let decimal = degrees + minutes / 60 + seconds / 3600;

            // If direction is South or West, make the result negative
            if (direction === 'S' || direction === 'W') {
                decimal = -decimal;
            }

            return decimal;
        };

        console.log(latStr)
        const lat = parseDMS(latStr);
        const lon = parseDMS(lonStr);
        return [lat, lon];
    };

    useEffect(() => {
        const fetchTrainDetail = async () => {
            try {
                const response = await fetch("https://mapy.spravazeleznic.cz/serverside/request2.php?module=Layers\\OsVlaky&&action=load");
                const data = await response.json();
                if (data.success) {
                    const trainDetail = data.result.find(t => t.id === id);
                    setTrain(trainDetail);

                    // Convert the JTSK coordinates to WGS84
                    const { coordinates } = trainDetail.geometry;
                    const yjtsk = coordinates[0]; // Y coordinate (JTSK)
                    const xjtsk = coordinates[1]; // X coordinate (JTSK)

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

        fetchTrainDetail();
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

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h1 className="text-2xl font-bold mb-2">{train.properties.na || train.properties.tt + " " + train.properties.tn}</h1>
                    <p className="text-gray-600 mb-2">Z: {train.properties.fn}</p>
                    <p className="text-gray-600 mb-2">K: {train.properties.ln}</p>
                    <p className="text-gray-600 mb-2">Odjezd: {train.properties.cp}</p>
                    <p className="text-gray-600 mb-2">Příjezd: {train.properties.cr}</p>
                    <p className="text-gray-600 mb-2">Zpoždění: {train.properties.pde || "Na čas"}</p>
                    <p className="text-gray-600 mb-2">Název vlaku: {train.properties.na}</p>
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
                        </MapContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TrainDetail;
