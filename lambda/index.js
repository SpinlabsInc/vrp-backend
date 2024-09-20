// lambda/index.js
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const method = event.httpMethod;

    if (method === 'GET') {
        const params = {
            TableName: TABLE_NAME,
        };
        const data = await dynamoDb.scan(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    }

    if (method === 'POST') {
        const item = JSON.parse(event.body);
        const params = {
            TableName: TABLE_NAME,
            Item: item,
        };
        await dynamoDb.put(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Item added' }),
        };
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Unsupported method' }),
    };
};
