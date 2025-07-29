const { CosmosClient } = require("@azure/cosmos");
module.exports = async function (context, req) {
    context.log('UpdatePart HTTP trigger function processed a request.');
    const partId = req.query.id || (req.body && req.body.id);
    const updatedPartData = req.body;
    if (!partId || !updatedPartData || partId !== updatedPartData.id) {
        context.res = { status: 400, body: "Please provide a part ID and updated part data with matching ID." };
        return;
    }
    const connectionString = process.env.CosmosDbConnectionString;
    if (!connectionString) { context.res = { status: 500, body: "Cosmos DB connection string not configured." }; return; }
    const client = new CosmosClient(connectionString);
    const database = client.database("ProjectTrackingDB");
    const container = database.container("Parts");
    try {
        // AUTHENTICATION/AUTHORIZATION GOES HERE: Validate JWT token.
        const { resource: replacedItem } = await container.item(partId, partId).replace(updatedPartData);
        context.res = { status: 200, body: replacedItem, headers: { 'Content-Type': 'application/json' } };
    } catch (error) {
        context.log.error("Error updating part:", error);
        if (error.code === 404) { context.res = { status: 404, body: `Part with ID '${partId}' not found.` }; }
        else { context.res = { status: 500, body: "Error updating part: " + error.message }; }
    }
};