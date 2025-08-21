import { Box, Flex, Link } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";

const Nav = () => {
	return (
		<Box background="black" width="100%" padding={8} color="white">
			<Flex gap="10" justifyContent={"center"} fontSize={"lg"} fontWeight={"bold"}>
				<Link href="../../public/nist-header-footer/nist-combined.css" target="_blank">
					User Guide <LuExternalLink />
				</Link>
				<Link href="https://github.com/usnistgov/pdf-digitization/" target="_blank">
					Github <LuExternalLink />
				</Link>
				<Link href="https://www.nist.gov/programs-projects/building-system-economics" target="_blank">
					Building System Economics <LuExternalLink />
				</Link>
			</Flex>
		</Box>
	);
};

export default Nav;
