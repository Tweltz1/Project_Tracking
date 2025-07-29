import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";

// --- Auth Context Definition ---
const AuthContext = createContext(null);

// --- MSAL Configuration ---
const msalConfig = {
    auth: {
        clientId: 'YOUR_B2C_WEB_APP_APPLICATION_CLIENT_ID', // <--- REPLACE THIS (from Phase 1, Step 2)
        authority: 'https://<your-b2c-tenant-name>.b2clogin.com/<your-b2c-tenant-name>.onmicrosoft.com/B2C_1_signup_signin', // <--- REPLACE THIS: Tenant name and user flow name
        redirectUri: 'https://nice-water-078be8810.2.azurestaticapps.net', // Your Azure Static Web App URL
        knownAuthorities: ['<your-b2c-tenant-name>.b2clogin.com'] // <--- REPLACE THIS: Just the tenant login domain
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

const msalInstance = new PublicClientApplication(msalConfig);

// --- AuthProvider (MSAL Wrapper) ---
const AuthProviderWithMsal = ({ children }) => {
    // Add event callback to handle redirect after login/logout
    useEffect(() => {
        const handleRedirect = (event) => {
            if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
                console.log("MSAL Login Success from redirect:", event.payload.account);
                // No need to set anything here directly, useMsal hook will update
            } else if (event.eventType === EventType.LOGOUT_SUCCESS) {
                console.log("MSAL Logout Success");
            }
        };

        const callbackId = msalInstance.addEventCallback(handleRedirect);

        return () => {
            if (callbackId) {
                msalInstance.removeEventCallback(callbackId);
            }
        };
    }, []);

    return (
        <MsalProvider instance={msalInstance}>
            <AuthContentWrapper>
                {children}
            </AuthContentWrapper>
        </MsalProvider>
    );
};

// --- AuthContentWrapper ---
const AuthContentWrapper = ({ children }) => {
    const { instance, accounts, inProgress } = useMsal(); // Added inProgress
    const isAuthenticated = useIsAuthenticated();
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        // MSAL handles redirect callbacks automatically
        // This effect processes the authentication state after MSAL is done
        if (!inProgress) { // Only update state when MSAL is not actively processing auth
            if (isAuthenticated && accounts.length > 0) {
                const account = accounts[0];
                setCurrentUser({ email: account.username });
                setUserId(account.homeAccountId || account.localAccountId); // Use a reliable ID from MSAL
            } else {
                setCurrentUser(null);
                setUserId(null);
            }
            setLoadingAuth(false);
        } else {
            // If MSAL is in progress (e.g., redirecting), keep loading state true
            setLoadingAuth(true);
        }
    }, [isAuthenticated, accounts, inProgress]); // Depend on inProgress to know when MSAL is done

    const login = async () => {
        try {
            // Use loginRedirect for full page redirect to B2C
            await instance.loginRedirect();
        } catch (error) {
            console.error("MSAL Login failed:", error);
        }
    };

    const logout = () => {
        // Use logoutRedirect for full page redirect for logout
        instance.logoutRedirect();
    };

    // Provide the real auth state and functions to the rest of the app
    return (
        <AuthContext.Provider value={{ currentUser, loadingAuth, userId, simulateLogin: login, simulateLogout: logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- MessageModal Component ---
const MessageModal = ({ alert, onClose }) => {
    if (!alert.message) return null;

    const bgColor = alert.type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const borderColor = alert.type === 'success' ? 'border-green-700' : 'border-red-700';

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`relative ${bgColor} text-white p-6 rounded-lg shadow-xl border-2 ${borderColor} max-w-sm w-full text-center`}>
                <p className="font-semibold text-lg mb-4">{alert.message}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-white text-gray-800 rounded-md hover:bg-gray-100 transition-colors duration-200 shadow-md"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

// --- Login Page Component ---
const LoginPage = () => {
    const { simulateLogin } = useContext(AuthContext);

    // The login and signup buttons will now directly trigger the MSAL redirect.
    // The email/password inputs are visually present but disabled, as B2C handles them.
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
                <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Project Tracking Login</h2>
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); simulateLogin(); }}>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            placeholder="your.email@example.com"
                            disabled // Disabled as B2C handles input
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            placeholder="••••••••"
                            disabled // Disabled as B2C handles input
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="button" // Change to type="button" to prevent form submission default
                            onClick={simulateLogin} // Directly trigger MSAL login
                            className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md text-lg"
                        >
                            Login
                        </button>
                        <button
                            type="button" // Change to type="button"
                            onClick={simulateLogin} // Directly trigger MSAL login (B2C handles signup through user flow)
                            className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition duration-200 shadow-md text-lg"
                        >
                            Sign Up
                        </button>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-4">
                        (Inputs disabled as Azure AD B2C handles actual authentication form)
                    </p>
                </form>
            </div>
        </div>
    );
};

// --- Dashboard Component ---
const Dashboard = ({ onViewDetails, onAddPart, currentUserId }) => {
    const [parts, setParts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [alert, setAlert] = useState({ message: '', type: '' });
    const { instance, accounts, inProgress } = useMsal(); // Include inProgress
    const isAuthenticated = useIsAuthenticated(); // Check if user is authenticated

    useEffect(() => {
        // Only try to fetch parts if not in an MSAL redirect flow and authenticated
        if (!inProgress && isAuthenticated) {
            fetchParts();
        }
    }, [isAuthenticated, inProgress]); // Depend on isAuthenticated and inProgress

    const fetchParts = async () => {
        setAlert({ message: '', type: '' });
        try {
            let accessToken = null;
            if (accounts.length > 0) {
                try {
                    // This scope should match an exposed API permission in your B2C app registration (if calling protected APIs)
                    // For now, using client ID as a placeholder scope to get a token
                    const request = {
                        scopes: ["openid", "profile", msalConfig.auth.clientId], // Default scopes for user profile + app client ID
                        account: accounts[0]
                    };
                    const response = await instance.acquireTokenSilent(request);
                    accessToken = response.accessToken;
                } catch (error) {
                    console.warn("Silent token acquisition failed. Trying interactive (popup/redirect).", error);
                    try {
                        // Fallback to interactive method (popup is easier for debugging, redirect for production)
                        const response = await instance.acquireTokenPopup({
                            scopes: ["openid", "profile", msalConfig.auth.clientId],
                            account: accounts[0]
                        });
                        accessToken = response.accessToken;
                    } catch (interactiveError) {
                        console.error("Interactive token acquisition failed:", interactiveError);
                        setAlert({ message: "Failed to acquire token. Please log in again.", type: "error" });
                        return;
                    }
                }
            }

            if (!accessToken) {
                setAlert({ message: "Authentication token missing. Please log in again.", type: "error" });
                return;
            }

            // Placeholder: In a real Azure app, replace with an API call to your Azure Function
            // Example: const response = await fetch('/api/GetParts', { headers: { 'Authorization': `Bearer ${accessToken}` } });
            // For now, still using local storage for data persistence
            const storedParts = JSON.parse(localStorage.getItem('projectTrackingParts') || '[]');
            setParts(storedParts);
            setAlert({ message: 'Parts loaded successfully!', type: 'success' });
        } catch (error) {
            console.error('Failed to fetch parts:', error);
            setAlert({ message: `Failed to load parts: ${error.message}`, type: 'error' });
        }
    };

    const filteredParts = parts.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.status.toLowerCase().includes(searchTerm.toLowerCase()) // Added status to search
    );

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Inventory Dashboard</h2>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <input
                    type="text"
                    placeholder="Search by Name, SN, Project Name/No., Status..."
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                    onClick={onAddPart}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md flex-shrink-0"
                >
                    Add New Part
                </button>
            </div>

            {alert.message && <MessageModal alert={alert} onClose={() => setAlert({ message: '', type: '' })} />}

            {filteredParts.length === 0 && !alert.message ? ( // Only show if no parts and no active alert
                <p className="text-center text-gray-500">No parts found. Add a new part!</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow-sm overflow-hidden">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">ID</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Name</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Quantity</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Status</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Location</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Serial No.</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Project Name</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Project No.</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParts.map(part => (
                                <tr key={part.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-150">
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.id}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.name}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.quantity}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.status}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.location}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.serialNumber}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.projectName}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{part.projectNumber}</td>
                                    <td className="py-3 px-4 text-sm">
                                        <button
                                            onClick={() => onViewDetails(part.id)}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 transition duration-200 shadow-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- PartDetails Component ---
const PartDetails = ({ partId, onBack, currentUserId }) => {
    const [part, setPart] = useState(null);
    const [quantityChange, setQuantityChange] = useState('');
    const [changeType, setChangeType] = useState('check-in');
    const [alert, setAlert] = useState({ message: '', type: '' });
    const qrCanvasRef = useRef(null);
    const scriptLoaded = useRef(false);
    const [qrReady, setQrReady] = useState(false);

    useEffect(() => {
        // Function to load the QRious script
        const loadScript = () => {
            if (scriptLoaded.current) {
                setQrReady(true);
                return;
            }
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
            script.onload = () => {
                scriptLoaded.current = true;
                setQrReady(true);
                drawQrCode();
            };
            script.onerror = () => {
                console.error("Failed to load QRious script.");
                setAlert({ message: "Failed to load QR code generator.", type: "error" });
            };
            document.body.appendChild(script);
        };

        // Draw QR code function
        const drawQrCode = () => {
            if (qrCanvasRef.current && window.QRious && part) {
                const baseUrl = window.location.origin;
                const partDetailsUrl = `${baseUrl}/part/${part.id}`;

                const context = qrCanvasRef.current.getContext('2d');
                if (context) {
                    context.clearRect(0, 0, qrCanvasRef.current.width, qrCanvasRef.current.height);
                }

                new window.QRious({
                    element: qrCanvasRef.current,
                    value: partDetailsUrl,
                    size: 200,
                    level: 'H'
                });
            }
        };

        // Load the part data
        const fetchPart = async () => {
            setAlert({ message: '', type: '' });
            const storedParts = JSON.parse(localStorage.getItem('projectTrackingParts') || '[]');
            const foundPart = storedParts.find(p => p.id === partId);
            if (foundPart) {
                setPart(foundPart);
                setAlert({ message: 'Part details loaded.', type: 'success' });
            } else {
                setAlert({ message: 'Part not found.', type: 'error' });
            }
        };

        fetchPart();
        loadScript();

        if (qrReady && part) {
            drawQrCode();
        }

        // Cleanup script tag on unmount if necessary
        return () => {
            // No direct removal needed for QRious as it's typically loaded once globally
        };
    }, [partId, part, qrReady]);

    const handleQuantityUpdate = async () => {
        setAlert({ message: '', type: '' });
        const changeVal = parseInt(quantityChange, 10);

        if (isNaN(changeVal) || changeVal <= 0) {
            setAlert({ message: 'Please enter a valid positive number for quantity.', type: 'error' });
            return;
        }

        let newCalculatedQuantity = part.quantity;
        if (changeType === 'check-in') {
            newCalculatedQuantity += changeVal;
        } else { // check-out
            if (part.quantity < changeVal) {
                setAlert({ message: 'Cannot check out more parts than available.', type: 'error' });
                return;
            }
            newCalculatedQuantity -= changeVal;
        }

        const updatedPart = {
            ...part,
            quantity: newCalculatedQuantity,
            history: [
                ...(part.history || []),
                {
                    type: changeType,
                    change: changeVal,
                    timestamp: new Date().toISOString(),
                    user: currentUserId || 'Anonymous'
                }
            ]
        };

        const storedParts = JSON.parse(localStorage.getItem('projectTrackingParts') || '[]');
        const updatedParts = storedParts.map(p => (p.id === part.id ? updatedPart : p));
        localStorage.setItem('projectTrackingParts', JSON.stringify(updatedParts));
        setPart(updatedPart); // Update local state
        setQuantityChange('');
        setAlert({ message: `${changeType === 'check-in' ? 'Checked in' : 'Checked out'} ${changeVal} units. New quantity: ${newCalculatedQuantity}.`, type: 'success' });
    };

    if (!part) {
        return (
            <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200 shadow-md">
                    Back to Dashboard
                </button>
                <div className="text-center text-gray-500">Loading part details or part not found...</div>
                {alert.message && <MessageModal alert={alert} onClose={() => setAlert({ message: '', type: '' })} />}
            </div>
        );
    }

    const printQrCode = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print QR Code</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        canvas { border: 1px solid #ccc; margin-bottom: 10px; }
                        p { font-size: 1.2em; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <canvas id="printQrCanvas"></canvas>
                    <p>Serial Number: ${part.serialNumber}</p>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
                    <script>
                        window.onload = function() {
                            const canvas = document.getElementById('printQrCanvas');
                            const baseUrl = '${window.location.origin}';
                            const partDetailsUrl = \`\${baseUrl}/part/${part.id}\`;
                            new QRious({
                                element: canvas,
                                value: partDetailsUrl,
                                size: 250,
                                level: 'H'
                            });
                            window.print();
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            setAlert({ message: "Could not open print window. Please allow pop-ups.", type: "error" });
        }
    };


    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <button
                onClick={onBack}
                className="mb-4 px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200 shadow-md"
            >
                Back to Dashboard
            </button>

            {alert.message && <MessageModal alert={alert} onClose={() => setAlert({ message: '', type: '' })} />}

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Part Details: {part.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <p className="mb-2"><strong className="text-gray-700">ID:</strong> {part.id}</p>
                    <p className="mb-2"><strong className="text-gray-700">Quantity:</strong> <span className="text-blue-600 font-semibold text-lg">{part.quantity}</span></p>
                    <p className="mb-2"><strong className="text-gray-700">Status:</strong> {part.status}</p>
                    <p className="mb-2"><strong className="text-gray-700">Location:</strong> {part.location}</p>
                    <p className="mb-2"><strong className="text-gray-700">Serial Number:</strong> {part.serialNumber}</p>
                    <p className="mb-2"><strong className="text-gray-700">Project Name:</strong> {part.projectName}</p>
                    <p className="mb-2"><strong className="text-gray-700">Project Number:</strong> {part.projectNumber}</p>
                    <p className="mb-2"><strong className="text-gray-700">Description:</strong> {part.description}</p>
                </div>

                <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-inner">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">QR Code for this Part</h3>
                    <canvas ref={qrCanvasRef} width="200" height="200" className="border border-gray-300 rounded-lg shadow-md mb-4"></canvas>
                    {qrReady && (
                        <>
                            <p className="text-center text-sm text-gray-600 mb-2">Scan this QR code to quickly access this part's details.</p>
                            <button
                                onClick={printQrCode}
                                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-200 shadow-md"
                            >
                                Print QR Code
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Check-in / Check-out</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        className="w-full sm:w-auto flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                        value={quantityChange}
                        onChange={(e) => setQuantityChange(e.target.value)}
                    />
                    <select
                        className="w-full sm:w-auto flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 bg-white"
                        value={changeType}
                        onChange={(e) => setChangeType(e.target.value)}
                    >
                        <option value="check-in">Check-in</option>
                        <option value="check-out">Check-out</option>
                    </select>
                    <button
                        onClick={handleQuantityUpdate}
                        className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md flex-shrink-0"
                    >
                        Submit
                    </button>
                </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Transaction History</h3>
                {part.history && part.history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg shadow-sm overflow-hidden">
                            <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Type</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Quantity Change</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Timestamp</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {part.history.map((entry, index) => (
                                    <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-150">
                                        <td className="py-3 px-4 text-sm text-gray-800 capitalize">{entry.type}</td>
                                        <td className="py-3 px-4 text-sm text-gray-800">{entry.change}</td>
                                        <td className="py-3 px-4 text-sm text-gray-800">{new Date(entry.timestamp).toLocaleString()}</td>
                                        <td className="py-3 px-4 text-sm text-gray-800 truncate" title={entry.user}>{entry.user}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center">No transaction history for this part.</p>
                )}
            </div>
        </div>
    );
};

// --- AddPartForm Component ---
const AddPartForm = ({ onPartAdded, onBack, currentUserId }) => {
    const [partData, setPartData] = useState({
        id: '',
        name: '',
        quantity: 0,
        location: '',
        serialNumber: '',
        projectName: '',
        projectNumber: '',
        description: '',
        status: 'Received', // Default status
        history: []
    });
    const [alert, setAlert] = useState({ message: '', type: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPartData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAlert({ message: '', type: '' });

        if (!partData.id || !partData.name || partData.quantity === '' || partData.quantity === null) {
            setAlert({ message: 'ID, Name, and Quantity are required.', type: 'error' });
            return;
        }

        const finalPartData = {
            ...partData,
            quantity: parseInt(partData.quantity, 10), // Ensure quantity is a number
            history: [{
                type: 'initial-add',
                change: parseInt(partData.quantity, 10),
                timestamp: new Date().toISOString(),
                user: currentUserId || 'Anonymous'
            }]
        };

        try {
            const storedParts = JSON.parse(localStorage.getItem('projectTrackingParts') || '[]');
            // Check for duplicate ID
            if (storedParts.some(p => p.id === finalPartData.id)) {
                setAlert({ message: 'Part with this ID already exists. Please use a unique ID.', type: 'error' });
                return;
            }
            const updatedParts = [...storedParts, finalPartData];
            localStorage.setItem('projectTrackingParts', JSON.stringify(updatedParts));
            setAlert({ message: 'Part added successfully!', type: 'success' });
            onPartAdded(); // Go back to dashboard
        } catch (error) {
            console.error('Failed to add part:', error);
            setAlert({ message: `Failed to add part: ${error.message}`, type: 'error' });
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <button
                onClick={onBack}
                className="mb-4 px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200 shadow-md"
            >
                Back to Dashboard
            </button>

            {alert.message && <MessageModal alert={alert} onClose={() => setAlert({ message: '', type: '' })} />}

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Part</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="id">Part ID (Unique)</label>
                        <input type="text" id="id" name="id" value={partData.id} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">Part Name</label>
                        <input type="text" id="name" name="name" value={partData.name} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="quantity">Quantity</label>
                        <input type="number" id="quantity" name="quantity" value={partData.quantity} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required min="0" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="location">Location</label>
                        <input type="text" id="location" name="location" value={partData.location} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="serialNumber">Serial Number</label>
                        <input type="text" id="serialNumber" name="serialNumber" value={partData.serialNumber} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="projectName">Project Name</label>
                        <input type="text" id="projectName" name="projectName" value={partData.projectName} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="projectNumber">Project Number</label>
                        <input type="text" id="projectNumber" name="projectNumber" value={partData.projectNumber} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="status">Status</label>
                        <select id="status" name="status" value={partData.status} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="Received">Received</option>
                            <option value="In Work">In Work</option>
                            <option value="Completed">Completed</option>
                            <option value="Sent Out">Sent Out</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6">
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="description">Description</label>
                    <textarea id="description" name="description" value={partData.description} onChange={handleChange} rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                <div className="flex justify-end mt-6">
                    <button type="submit"
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md text-lg">
                        Add Part
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- Project Tracking App Content (Main Application UI) ---
const ProjectTrackingAppContent = () => {
    const { currentUser, loadingAuth, simulateLogout, userId } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [selectedPartId, setSelectedPartId] = useState(null);

    // If MSAL is in progress (e.g., redirecting), show a loading state
    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading authentication...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-inter">
            <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center flex-wrap gap-2">
                <h1 className="text-2xl font-bold flex-shrink-0">Project Tracking App</h1>
                {currentUser && (
                    <div className="flex items-center space-x-4 flex-grow justify-end">
                        <span className="text-sm">Logged in as: {currentUser.email}</span>
                        <button
                            onClick={simulateLogout}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition duration-200 shadow-md"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-grow p-4">
                {!currentUser ? (
                    <LoginPage /> // Display LoginPage if no user is authenticated
                ) : (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        {currentPage === 'dashboard' && (
                            <Dashboard
                                onViewDetails={(id) => {
                                    setSelectedPartId(id);
                                    setCurrentPage('partDetails');
                                }}
                                onAddPart={() => setCurrentPage('addPart')}
                                currentUserId={userId}
                            />
                        )}
                        {currentPage === 'partDetails' && selectedPartId && (
                            <PartDetails
                                partId={selectedPartId}
                                onBack={() => setCurrentPage('dashboard')}
                                currentUserId={userId}
                            />
                        )}
                        {currentPage === 'addPart' && (
                            <AddPartForm
                                onPartAdded={() => setCurrentPage('dashboard')}
                                onBack={() => setCurrentPage('dashboard')}
                                currentUserId={userId}
                            />
                        )}
                    </div>
                )}
            </main>

            <footer className="bg-gray-800 text-white p-4 text-center text-sm shadow-inner">
                &copy; {new Date().getFullYear()} Project Tracking. All rights reserved. User ID: {currentUser ? userId : 'N/A'}
            </footer>
        </div>
    );
};

// --- Main App Component (Default Export) ---
const App = () => {
    return (
        <div className="App">
            <AuthProviderWithMsal>
                <ProjectTrackingAppContent />
            </AuthProviderWithMsal>
        </div>
    );
};

export default App;
