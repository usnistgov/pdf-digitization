import { Image, Link, List, Stack, Text } from "@chakra-ui/react";
const Header = () => {
	return (
		<>
			<Stack direction={"row"}>
				<Image src={"/logo.png"} height="80px" width="100" alt="parsEPD logo" />
				<Text textStyle="6xl" fontWeight={800}>
					: Digitize Your EPDs
				</Text>
			</Stack>

			<br />
			<Text textStyle="lg" fontWeight="semibold">
				parsEPD converts an EPD from PDF or HTML file to a standardized, machine-readable JSON format (openEPD) using a
				large language model (LLM) for parsing and conversion. For details about the process, please see the{" "}
				<Link href="/user-guide.html" target="_blank" color="#008080">
					parsEPD User Guide
				</Link>
				.
			</Text>
			<br />
			<List.Root textStyle="lg" fontWeight="semibold">
				Steps to use parsEPD:
			</List.Root>
			<List.Root fontWeight="semibold" textStyle="lg">
				<List.Item textStyle="md">
					Upload your PDF formatted EPD – Watch as parsEPD automatically validates whether the PDF is an EPD, identifies
					the product category, counts the number of products, and then creates and displays the openEPD file.
				</List.Item>
				<List.Item textStyle="md">View the openEPD file.</List.Item>
				<List.Item textStyle="md">Download the openEPD File using the “Download” button in the chat. </List.Item>
				<List.Item textStyle="md">
					The user can remove or replace the EPD as well as start over using options provided in left sidebar.{" "}
				</List.Item>
				<List.Item textStyle="md">Only the most recently uploaded EPD is available for conversion.</List.Item>
			</List.Root>
		</>
	);
};

export default Header;
