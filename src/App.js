import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";

// --- Auth Context Definition ---
const AuthContext = createContext(null);

// --- MSAL Configuration ---
const msalConfig = {
    auth: {
        clientId: '5aa716c1-5e3e-4227-b897-061de2e2b482', // Your Application (client) ID
        authority: 'https://compprojecttracking.b2clogin.com/compprojecttracking.onmicrosoft.com/B2C_1_signup_signin', // Your B2C Tenant Name and User Flow Name
        redirectUri: 'https://polite-ocean-05506b310.1.azurestaticapps.net/', // Your Azure Static Web App URL
        knownAuthorities: ['compprojecttracking.b2clogin.com'] // Just the tenant login domain
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

const msalInstance = new PublicClientApplication(msalConfig);

// --- AuthProvider (MSAL Wrapper) ---
const AuthProviderWithMsal = ({ children }) => {
    useEffect(() => {
        console.log("AuthProviderWithMsal: Setting up MSAL event callbacks.");

        const handleMsalEvent = (event) => { // Generic event handler
            console.log("MSAL Event Fired:", event.eventType, event.payload);
            if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
                console.log("SUCCESS: MSAL LOGIN_SUCCESS event detected with account:", event.payload.account.username);
            } else if (event.eventType === EventType.LOGOUT_SUCCESS) {
                console.log("SUCCESS: MSAL LOGOUT_SUCCESS event detected.");
            }
        };

        const callbackId = msalInstance.addEventCallback(handleMsalEvent);

        // Explicitly handle redirect promise. MsalProvider usually does this, but good for debugging.
        msalInstance.handleRedirectPromise().then((response) => {
            if (response) {
                console.log("MSAL handleRedirectPromise resolved with response:", response);
                // At this point, accounts and isAuthenticated should update
            } else {
                console.log("MSAL handleRedirectPromise resolved: No active redirect (e.g., initial load or not a redirect URI).");
            }
        }).catch((error) => {
            console.error("MSAL handleRedirectPromise FAILED:", error); // Critical to see if an error happens here
        });

        return () => {
            if (callbackId) {
                console.log("AuthProviderWithMsal cleanup: Removing event callback.");
                msalInstance.removeEventCallback(callbackId);
            }
        };
    }, []); // Empty dependency array, runs once on mount

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
    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true); // Initialized to true
    const [userId, setUserId] = useState(null);

    // Add console logs here to trace the state
    useEffect(() => {
        console.log("AuthContext useEffect triggered:");
        console.log("  inProgress:", inProgress);
        console.log("  isAuthenticated:", isAuthenticated);
        console.log("  accounts:", accounts);

        if (!inProgress) {
            console.log("MSAL is NOT in progress.");
            if (isAuthenticated && accounts.length > 0) {
                const account = accounts[0];
                setCurrentUser({ email: account.username });
                setUserId(account.homeAccountId || account.localAccountId);
                console.log("  User is authenticated:", account.username);
                setLoadingAuth(false); // Should set to false if authenticated
            } else {
                console.log("  User is NOT authenticated or no accounts found.");
                setCurrentUser(null);
                setUserId(null);
                setLoadingAuth(false); // Should set to false if not authenticated (to show login page)
            }
        } else {
            console.log("MSAL is IN PROGRESS (e.g., redirecting or processing).");
            setLoadingAuth(true); // Keep loading if in progress
        }
    }, [isAuthenticated, accounts, inProgress]); // Dependencies for useEffect

    const login = async () => {
        try {
            console.log("Login button clicked: Attempting MSAL loginRedirect...");
            await instance.loginRedirect();
            // This line might not be reached if redirect happens immediately
            console.log("loginRedirect initiated (this might not log if redirect happens).");
        } catch (error) {
            console.error("MSAL Login failed:", error); // Check for this specific error in console
        }
    };

    const logout = () => {
        console.log("Logout button clicked: Attempting MSAL logoutRedirect...");
        instance.logoutRedirect();
    };

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
                            disabled
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            placeholder="••••••••"
                            disabled
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="button"
                            onClick={simulateLogin}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md text-lg"
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={simulateLogin}
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
    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const fetchParts = useCallback(async () => {
        setAlert({ message: '', type: '' });
        try {
            let accessToken = null;
            if (isAuthenticated && accounts.length > 0) {
                try {
                    const request = {
                        scopes: ["openid", "profile", msalConfig.auth.clientId],
                        account: accounts[0]
                    };
                    const response = await instance.acquireTokenSilent(request);
                    accessToken = response.accessToken;
                } catch (error) {
                    console.warn("Silent token acquisition failed. Trying interactive (popup/redirect).", error);
                    const response = await instance.acquireTokenPopup({
                        scopes: ["openid", "profile", msalConfig.auth.clientId],
                        account: accounts[0]
                    });
                    accessToken = response.accessToken;
                }
            }

            if (!accessToken) {
                setAlert({ message: "Authentication token missing. Please log in again.", type: "error" });
                return;
            }

            const response = await fetch('/api/GetParts', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setParts(data);
            setAlert({ message: 'Parts loaded successfully!', type: 'success' });
        }
        catch (error) {
            console.error('Failed to fetch parts:', error);
            setAlert({ message: `Failed to load parts: ${error.message}`, type: 'error' });
        }
    }, [isAuthenticated, accounts, instance]);

    useEffect(() => {
        if (!inProgress && isAuthenticated) {
            fetchParts();
        }
    }, [isAuthenticated, inProgress, fetchParts]);

    const filteredParts = parts.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Inventory Dashboard</h2>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <input
                    type="text"
                    placeholder="Search by Name, SN, Project Name/No."
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

            {filteredParts.length === 0 && !alert.message ? (
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
    const [newStatus, setNewStatus] = useState('');
    const [alert, setAlert] = useState({ message: '', type: '' });
    const qrCanvasRef = useRef(null);
    const scriptLoaded = useRef(false);
    const [qrReady, setQrReady] = useState(false);

    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const statusOptions = ['Received', 'In Work', 'Completed', 'Sent Out'];

    const loadQrScriptAndDraw = useCallback(() => {
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

        if (scriptLoaded.current) {
            setQrReady(true);
            drawQrCode();
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
    }, [part]);

    const fetchPart = useCallback(async () => {
        setAlert({ message: '', type: '' });
        try {
            let accessToken = null;
            if (isAuthenticated && accounts.length > 0) {
                try {
                    const request = {
                        scopes: ["openid", "profile", msalConfig.auth.clientId],
                        account: accounts[0]
                    };
                    const response = await instance.acquireTokenSilent(request);
                    accessToken = response.accessToken;
                } catch (error) {
                    console.warn("Silent token acquisition failed. Trying interactive (popup/redirect).", error);
                    const response = await instance.acquireTokenPopup({
                        scopes: ["openid", "profile", msalConfig.auth.clientId],
                        account: accounts[0]
                    });
                    accessToken = response.accessToken;
                }
            }

            if (!accessToken) {
                setAlert({ message: "Authentication token missing. Please log in again.", type: "error" });
                return;
            }

            const response = await fetch(`/api/GetPartById?id=${partId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const foundPart = await response.json();
            setPart(foundPart);
            setNewStatus(foundPart.status || 'Received');
            setAlert({ message: 'Part details loaded.', type: 'success' });

        } catch (error) {
            console.error('Failed to fetch part details:', error);
            setAlert({ message: `Failed to load part details: ${error.message}`, type: 'error' });
            setPart(null);
        }
    }, [partId, isAuthenticated, accounts, instance]);

    useEffect(() => {
        if (!inProgress && isAuthenticated) {
            fetchPart();
        }
        if (part && qrReady) {
            loadQrScriptAndDraw();
        }
    }, [partId, part, qrReady, fetchPart, inProgress, isAuthenticated, loadQrScriptAndDraw]);

    const handleQuantityUpdate = useCallback(async () => {
        setAlert({ message: '', type: '' });
        const changeVal = parseInt(quantityChange, 10);

        if (isNaN(changeVal) || changeVal <= 0) {
            setAlert({ message: 'Please enter a valid positive number for quantity.', type: 'error' });
            return;
        }

        let newCalculatedQuantity = part.quantity;
        if (changeType === 'check-in') {
            newCalculatedQuantity += changeVal;
        } else {
            if (part.quantity < changeVal) {
                setAlert({ message: 'Cannot check out more parts than available.', type: 'error' });
                return;
            }
            newCalculatedQuantity -= changeVal;
        }

        let accessToken = null;
        if (isAuthenticated && accounts.length > 0) {
            try {
                const request = {
                    scopes: ["openid", "profile", msalConfig.auth.clientId],
                    account: accounts[0]
                };
                const response = await instance.acquireTokenSilent(request);
                accessToken = response.accessToken;
            } catch (error) {
                console.warn("Silent token acquisition failed. Trying interactive.", error);
                const response = await instance.acquireTokenPopup({
                    scopes: ["openid", "profile", msalConfig.auth.clientId],
                    account: accounts[0]
                });
                accessToken = response.accessToken;
            }
        }

        if (!accessToken) {
            setAlert({ message: "Authentication token missing. Please log in again.", type: "error" });
            return;
        }

        const updatedPartDataForApi = {
            partId: part.id,
            newQuantity: newCalculatedQuantity,
            type: changeType,
            change: changeVal,
            userId: currentUserId || 'Anonymous'
        };

        try {
            const response = await fetch('/api/CheckInCheckOut', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedPartDataForApi)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const updatedPartFromServer = await response.json();
            setPart(updatedPartFromServer);
            setQuantityChange('');
            setAlert({ message: `${changeType === 'check-in' ? 'Checked in' : 'Checked out'} ${changeVal} units. New quantity: ${newCalculatedQuantity}.`, type: 'success' });
        } catch (error) {
            console.error('Failed to update quantity:', error);
            setAlert({ message: `Failed to update quantity: ${error.message}`, type: 'error' });
        }
    }, [quantityChange, changeType, part, currentUserId, isAuthenticated, accounts, instance]);

    const handleStatusUpdate = useCallback(async () => {
        setAlert({ message: '', type: '' });
        if (!part || !newStatus || newStatus === part.status) {
            setAlert({ message: "Please select a new status to update.", type: "error" });
            return;
        }

        let accessToken = null;
        if (isAuthenticated && accounts.length > 0) {
            try {
                const request = {
                    scopes: ["openid", "profile", msalConfig.auth.clientId],
                    account: accounts[0]
                };
                const response = await instance.acquireTokenSilent(request);
                accessToken = response.accessToken;
            } catch (error) {
                console.warn("Silent token acquisition failed. Trying interactive.", error);
                const response = await instance.acquireTokenPopup({
                    scopes: ["openid", "profile", msalConfig.auth.clientId],
                    account: accounts[0]
                });
                accessToken = response.accessToken;
            }
        }

        if (!accessToken) {
            setAlert({ message: "Authentication token missing. Please log in again.", type: "error" });
            return;
        }

        const historyEntry = {
            type: 'status-update',
            oldStatus: part.status,
            newStatus: newStatus,
            timestamp: new Date().toISOString(),
            user: currentUserId || 'Anonymous',
        };

        const updatedPartDataForApi = {
            ...part,
            status: newStatus,
            history: [...(part.history || []), historyEntry]
        };

        try {
            const response = await fetch(`/api/UpdatePart?id=${part.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedPartDataForApi)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const updatedPartFromServer = await response.json();
            setPart(updatedPartFromServer);
            setAlert({ message: `Part status updated to: ${newStatus}`, type: 'success' });
        } catch (error) {
            console.error("Error updating status:", error);
            setAlert({ message: "Error updating status. Please try again.", type: "error" });
        }
    }, [part, newStatus, currentUserId, isAuthenticated, accounts, instance]);

    const printQrCode = useCallback(() => {
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
                            const baseUrl = '${window.location.origin}'; // This is line 580
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
    }, [part]);

    if (!part) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading part details...</div>
            </div>
        );
    }

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

            {/* Status Update Section */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Update Status</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <select
						value={newStatus}
						onChange={(e) => setNewStatus(e.target.value)}
						className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
					>
						{statusOptions.map(option => (
							<option key={option} value={option}>{option}</option>
						))}
					</select>
                    <button
						onClick={handleStatusUpdate} // <--- Ensure this is correct
						className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition duration-200 shadow-md whitespace-nowrap"
					>
						Update Status
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

    // CORRECTED LINE: Removed 'inProgress' as it's not directly used in this component
    const { instance, accounts } = useMsal(); 
    const isAuthenticated = useIsAuthenticated();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPartData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setAlert({ message: '', type: '' });

        if (!partData.id || !partData.name || partData.quantity === '' || partData.quantity === null) {
            setAlert({ message: 'ID, Name, and Quantity are required.', type: 'error' });
            return;
        }

        let accessToken = null;
        if (isAuthenticated && accounts.length > 0) {
            try {
                const request = {
                    scopes: ["openid", "profile", msalConfig.auth.clientId],
                    account: accounts[0]
                };
                const response = await instance.acquireTokenSilent(request);
                accessToken = response.accessToken;
            } catch (error) {
                console.warn("Silent token acquisition failed. Trying interactive.", error);
                const response = await instance.acquireTokenPopup({
                    scopes: ["openid", "profile", msalConfig.auth.clientId],
                    account: accounts[0]
                });
                accessToken = response.accessToken;
            }
        }

        if (!accessToken) {
            setAlert({ message: "Authentication token missing. Please log in again.", type: "error" });
            return;
        }

        const finalPartData = {
            ...partData,
            quantity: parseInt(partData.quantity, 10),
            history: [{
                type: 'initial-add',
                change: parseInt(partData.quantity, 10),
                timestamp: new Date().toISOString(),
                user: currentUserId || 'Anonymous'
            }]
        };

        try {
            const response = await fetch('/api/CreatePart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalPartData)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const createdPart = await response.json();
            setAlert({ message: `Part '${createdPart.name}' added successfully!`, type: 'success' });
            onPartAdded();
        } catch (error) {
            console.error('Failed to add part:', error);
            setAlert({ message: `Failed to add part: ${error.message}`, type: 'error' });
        }
    }, [partData, currentUserId, isAuthenticated, accounts, instance, onPartAdded]);

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

    // inProgress is handled within AuthContentWrapper to set loadingAuth,
    // so no direct change needed here for the ESLint warning related to inProgress.
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
                    <LoginPage />
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