const { CosmosClient } = require("@azure/cosmos");
module.exports = async function (context, req) {
    context.log('CheckInCheckOut HTTP trigger function processed a request.');
    const { partId, newQuantity, type, change, userId } = req.body;
    if (!partId || typeof newQuantity !== 'number' || !type || typeof change !== 'number') {
        context.res = { status: 400, body: "Please provide partId, newQuantity, type, change, and userId." };
        return;
    }
    const connectionString = process.env.CosmosDbConnectionString;
    if (!connectionString) { context.res = { status: 500, body: "Cosmos DB connection string not configured." }; return; }
    const client = new CosmosClient(connectionString);
    const database = client.database("ProjectTrackingDB");
    const container = database.container("Parts");
    try {
        // AUTHENTICATION/AUTHORIZATION GOES HERE: Validate JWT token.
        const { resource: existingPart } = await container.item(partId, partId).read();
        if (!existingPart) { context.res = { status: 404, body: `Part with ID '${partId}' not found.` }; return; }
        existingPart.quantity = newQuantity;
        if (!existingPart.history) { existingPart.history = []; }
        existingPart.history.push({ type: type, change: change, timestamp: new Date().toISOString(), user: userId || 'Anonymous' });
        const { resource: updatedItem } = await container.item(partId, partId).replace(existingPart);
        context.res = { status: 200, body: updatedItem, headers: { 'Content-Type': 'application/json' } };
    } catch (error) {
        context.log.error("Error checking in/out part:", error);
        context.res = { status: 500, body: "Error checking in/out part: " + error.message };
    }
};