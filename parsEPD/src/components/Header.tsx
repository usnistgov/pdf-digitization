import { Highlight, List, Text } from "@chakra-ui/react";
const Header = () => {
	return (
		<>
			<Text textStyle="6xl" fontWeight={800}>
				<Highlight query="EPD" styles={{ color: "teal.600" }}>
					parsEPD:&nbsp;
				</Highlight>
				Digitize Your EPDs
			</Text>
			<br />
			<Text textStyle="lg" fontWeight="semibold">
				parsEPD converts an EPD from PDF or HTML format to a standardized, machine-readable JSON format (openEPD) using
				a large language model (LLM) for the parsing and conversion. For details about the process, please see the
				ParsEPD User Guide.
			</Text>
			<br />
			<List.Root textStyle="lg" fontWeight="semibold">
				Steps to Use ParsEPD:
			</List.Root>
			<List.Root fontWeight="semibold" textStyle="lg">
				<List.Item textStyle="md">
					Upload your PDF formatted EPD – ParsEPD automatically Watch as parsEPD validates that the PDF is an EPD,
					identifies, its product category, and then creates and displays the openEPD file.
				</List.Item>
				<List.Item textStyle="md">View the openEPD file in the chat. </List.Item>
				<List.Item textStyle="md">Download the openEPD File using the “Download” button in the chat. </List.Item>
				<List.Item textStyle="md">
					The user can remove or replace the EPD as well as start over using options provided in left hand column.{" "}
				</List.Item>
				<List.Item textStyle="md">Only the most recent uploaded EPD is available for conversion.</List.Item>
			</List.Root>
		</>
	);
};

export default Header;
