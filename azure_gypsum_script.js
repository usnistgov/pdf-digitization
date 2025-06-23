const { AzureKeyCredential, DocumentAnalysisClient } = require("@azure/ai-form-recognizer");
const { BlobServiceClient, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");

const fs = require("fs");
require("dotenv").config();

const KEY = process.env.KEY;
const ENDPOINT = process.env.ENDPOINT;
const STORAGE_ACC_CONNECTION_STRING = process.env.STORAGE_ACC_CONNECTION_STRING;
const CONTAINER_NAME = process.env.CONTAINER_NAME;
const ACCOUNT = process.env.ACCOUNT;
const ACCOUNT_KEY = process.env.ACCOUNT_KEY;

// Connect to the storage account
const blob_service_client = BlobServiceClient.fromConnectionString(STORAGE_ACC_CONNECTION_STRING);

// Get a reference to the container
const container_client = blob_service_client.getContainerClient(CONTAINER_NAME);

const get_BLOB_names = async () => {
	const pdfs = [];

	// Retrieve a flat list of all the blobs in the container
	const blobs = container_client.listBlobsFlat();

	for await (const blob of blobs) {
		pdfs.push(await getSASToken(blob.name));
	}
	return pdfs;
};

const getSASToken = async (blobName) => {
	// Get a reference to the blob
	const blobClient = container_client.getBlobClient(blobName);

	// Create the SAS token
	const sasPermissions = BlobSASPermissions.parse("r"); // Read permission
	const expiresOn = new Date(Date.now() + 3600 * 1000); // 1 hour from now
	const containerName = CONTAINER_NAME;

	// Create the SAS signature values
	const sasValues = {
		containerName,
		blobName,
		permissions: sasPermissions,
		expiresOn,
	};

	const sasToken = await blobClient.generateSasUrl(sasValues, new StorageSharedKeyCredential(ACCOUNT, ACCOUNT_KEY));
	return sasToken;
};

function generateCSV(data, csvfile, filename) {
	const excludedValues = new Set([
		"Product Formulation",
		"Additive",
		"Percentage",
		"Amount (kg/1000 sq ft)",
		"Percentqage",
		"Percentage)",
		"Component",
		"Extreme Abuse",
		"Extreme Impact",
		"Product Specifications",
	]);

	const dataRows = data.map((obj) => {
		return Object.entries(obj)
			.filter(
				([key, value]) =>
					key === "content" &&
					!excludedValues.has(value) &&
					!value.startsWith("Type") &&
					!value.startsWith("GlasRoc") &&
					!value.startsWith("M2") &&
					!value.startsWith("Silent"),
			)
			.map(([, value]) => value)
			.join(",")
			.trim();
	});

	dataRows.unshift(filename); // Add filename as the first row
	const csvContent = dataRows.filter((row) => row.length > 0).join(",");
	csvfile.push(csvContent);
	return csvfile;
}

function getDeclarationNumber(obj) {
	const regex = /^(EPD \d+|EPD\d+|(\d+\.\d+\.\d+\.\d+)|EPD #\d+|EPD \d+)$/;
	const regex2 = /^\d+\.\d+\.\d+$/;

	if (obj === null || typeof obj !== "object") return null;

	if ((obj.content && regex.test(obj.content)) || regex2.test(obj.content)) {
		return obj.content;
	}

	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const result = getDeclarationNumber(obj[key]);
			if (result) return result;
		}
	}

	return null; // Return null if no matches are found
}

async function main() {
	const client = new DocumentAnalysisClient(ENDPOINT, new AzureKeyCredential(KEY));
	const pdfs_sas = await get_BLOB_names();
	let csvfile = [["filename", "declaration_number", "material1", "content", "material2", "content", "material3"]];
	const failedCalls = [];
	const allTables = [];
	const dec_nums = [];
	let i = 0;
	for (const pdf of pdfs_sas) {
		try {
			const poller = await client.beginAnalyzeDocument("prebuilt-layout", pdf);
			const { tables } = await poller.pollUntilDone();
			const filename = pdf.split("/").pop();

			if (tables.length === 0) continue;
			const dec_num = getDeclarationNumber(tables);

			let flag = false;
			for (const table of tables) {
				if (
					["Product Formulation", "Material Content", "Gypsum", "Component", "Product Specifications"].includes(
						table.cells[0].content,
					)
				) {
					console.log(dec_num);
					dec_nums.push([filename, dec_num]);
					csvfile = generateCSV(table.cells, csvfile, [filename, dec_num]);
					flag = true;
				}
				allTables.push({ file: filename, "added to csv": flag });
			}
		} catch (error) {
			console.error(`Failed API Call - ${pdf} - ${error}`);
			failedCalls.push(`Failed API Call - ${pdf} - ${error}`);
		}
		i++;
		console.log(i);
	}

	// Write CSV content to a file
	fs.writeFileSync("output5.csv", csvfile.join("\n"), "utf8");
	console.log(`CSV file 'output5.csv' generated successfully.`);

	if (failedCalls.length > 0) {
		fs.writeFileSync("failed_calls.txt", failedCalls.join("\n"), "utf8");
		console.log("Failed API calls written to 'failed_calls.txt'.");
	}
}
main();
