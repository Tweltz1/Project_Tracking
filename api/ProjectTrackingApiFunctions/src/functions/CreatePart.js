const { CosmosClient } = require("@azure/cosmos");
module.exports = async function (context, req) {
    context.log('CreatePart HTTP trigger function processed a request.');
    const newPartData = req.body;
    if (!newPartData || !newPartData.id || !newPartData.name || typeof newPartData.quantity !== 'number') {
        context.res = { status: 400, body: "Please provide part object with id, name, and quantity." };
        return;
    }
    const connectionString = process.env.CosmosDbConnectionString;
    if (!connectionString) { context.res = { status: 500, body: "Cosmos DB connection string not configured." }; return; }
    const client = new CosmosClient(connectionString);
    const database = client.database("ProjectTrackingDB");
    const container = database.container("Parts");
    try {
        // AUTHENTICATION/AUTHORIZATION GOES HERE: Validate JWT token.
        const { resource: createdItem } = await container.items.create(newPartData);
        context.res = { status: 201, body: createdItem, headers: { 'Content-Type': 'application/json' } };
    } catch (error) {
        context.log.error("Error creating part:", error);
        context.res = { status: 500, body: "Error creating part: " + error.message };
    }
};
