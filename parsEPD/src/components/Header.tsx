import { Box, Flex, Link } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";

import React from "react";

const Header = () => {
	return (
		<Box background="black" width="100%" padding={8} color="white">
			<Flex gap="10" justifyContent={"flex-end"}>
				<Link href="https://www.nist.gov" target="_blank" colorPalette="blue">
					User Guide <LuExternalLink />
				</Link>
				<Link href="https://www.nist.gov" target="_blank" colorPalette="blue">
					Github <LuExternalLink />
				</Link>
				<Link href="https://www.nist.gov" target="_blank" colorPalette="blue">
					User Guide <LuExternalLink />
				</Link>
			</Flex>
		</Box>
	);
};

export default Header;
