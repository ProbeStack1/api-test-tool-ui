import React, { useState } from 'react';
import { Search, Globe, Download, Star, GitFork, User } from 'lucide-react';
import clsx from 'clsx';

export default function Explore({ onImport }) {
    const [searchTerm, setSearchTerm] = useState('');

    const publicAPIs = [
        { id: '1', name: 'JSONPlaceholder', desc: 'Free fake REST API for testing and prototyping with posts, users, todos.', category: 'Testing', stars: '45k', forks: '2.3k', url: 'https://jsonplaceholder.typicode.com/posts/1' },
        { id: '2', name: 'HTTPBin', desc: 'HTTP Request & Response Service - perfect for testing all HTTP methods.', category: 'Testing', stars: '8k', forks: '1.2k', url: 'https://httpbin.org/get' },
        { id: '3', name: 'ReqRes', desc: 'A hosted REST API ready to respond to your AJAX requests. No auth needed.', category: 'Testing', stars: '5k', forks: '800', url: 'https://reqres.in/api/users/1' },
        { id: '4', name: 'REST Countries', desc: 'Get information about countries via a RESTful API. No authentication required.', category: 'Data', stars: '15k', forks: '1.8k', url: 'https://restcountries.com/v3.1/name/usa' },
        { id: '5', name: 'PokeAPI', desc: 'All the Pokémon data you\'ll ever need in one place, easily accessible.', category: 'Fun', stars: '22k', forks: '1.1k', url: 'https://pokeapi.co/api/v2/pokemon/ditto' },
        { id: '6', name: 'Random User', desc: 'Generate random user data. Like Lorem Ipsum, but for people.', category: 'Data', stars: '12k', forks: '900', url: 'https://randomuser.me/api/' },
        { id: '7', name: 'DummyJSON', desc: 'Fake REST API for testing your frontend applications with realistic data.', category: 'Testing', stars: '7k', forks: '600', url: 'https://dummyjson.com/products/1' },
        { id: '8', name: 'Cat Facts', desc: 'Daily cat facts API. Get random cat facts to brighten your day.', category: 'Fun', stars: '3k', forks: '200', url: 'https://catfact.ninja/fact' },
        { id: '9', name: 'Dog API', desc: 'The internet\'s biggest collection of open source dog pictures.', category: 'Fun', stars: '6k', forks: '400', url: 'https://dog.ceo/api/breeds/image/random' },
        { id: '10', name: 'Quotes API', desc: 'Free API for getting random quotes, famous quotes, and more.', category: 'Content', stars: '4k', forks: '300', url: 'https://api.quotable.io/random' },
        { id: '11', name: 'SpaceX API', desc: 'Open Source REST API for launch, rocket, core, capsule, and starlink data.', category: 'Education', stars: '18k', forks: '800', url: 'https://api.spacexdata.com/v4/launches/latest' },
        { id: '12', name: 'NASA API', desc: 'Access to the data returned by the NASA API including APOD, asteroids, and more.', category: 'Science', stars: '28k', forks: '3k', url: 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY' },
        { id: '13', name: 'JSONPlaceholder - Users', desc: 'Get user data - perfect for testing user management endpoints.', category: 'Testing', stars: '45k', forks: '2.3k', url: 'https://jsonplaceholder.typicode.com/users/1' },
        { id: '14', name: 'JSONPlaceholder - Todos', desc: 'Todo items API - great for testing CRUD operations.', category: 'Testing', stars: '45k', forks: '2.3k', url: 'https://jsonplaceholder.typicode.com/todos/1' },
        { id: '15', name: 'IP Info', desc: 'Get information about any IP address including location and ISP.', category: 'Utilities', stars: '2k', forks: '150', url: 'https://ipapi.co/json/' },
        { id: '16', name: 'HTTPBin - POST', desc: 'Test POST requests with this endpoint. Accepts JSON and form data.', category: 'Testing', stars: '8k', forks: '1.2k', url: 'https://httpbin.org/post' },
        { id: '17', name: 'HTTPBin - Status', desc: 'Return given HTTP Status code. Useful for testing error handling.', category: 'Testing', stars: '8k', forks: '1.2k', url: 'https://httpbin.org/status/200' },
        { id: '18', name: 'CoinGecko', desc: 'Cryptocurrency prices, market data, and coin information. Free tier available.', category: 'Finance', stars: '10k', forks: '2k', url: 'https://api.coingecko.com/api/v3/ping' },
    ];

    const filteredAPIs = publicAPIs.filter(api => api.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex-1 overflow-auto bg-dark-900 p-8 flex flex-col items-center">
            <header className="w-full max-w-5xl mb-12 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800 border border-dark-700 text-gray-300 text-xs font-medium mb-6">
                    <Globe className="w-3 h-3 text-primary" />
                    <span>Public API Network</span>
                </div>

                <h1 className="text-4xl font-bold text-white mb-6">
                    Explore thousands of <span className="text-primary">public APIs</span>
                </h1>

                <div className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search for APIs, workspaces, and collections..."
                        className="w-full h-14 bg-dark-800 border border-dark-700 rounded-full pl-12 pr-6 text-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAPIs.map(api => (
                    <div key={api.id} className="group bg-dark-800 border border-dark-700 rounded-xl p-6 hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors font-bold text-lg">
                                {api.name[0]}
                            </div>
                            <div className="px-2 py-1 bg-dark-700/50 rounded text-[10px] text-gray-400 font-mono border border-dark-700">
                                {api.category}
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{api.name}</h3>
                        <p className="text-sm text-gray-400 mb-6 line-clamp-2 flex-1">{api.desc}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-dark-700">
                            <div className="flex gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {api.stars}</span>
                                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {api.forks}</span>
                            </div>
                            <button
                                onClick={() => onImport(api)}
                                className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded transition-colors flex items-center gap-1"
                            >
                                <Download className="w-3 h-3" /> Import
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
