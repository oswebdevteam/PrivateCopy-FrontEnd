import walletModalCss from "@near-wallet-selector/modal-ui/styles.css?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useState } from "react";
import { AppFooter } from "#/components/AppFooter";
import { AppHeader } from "#/components/AppHeader";
import appCss from "#/styles.css?url";

/** Resolves the theme before first paint so the page never flashes light. */
const THEME_INIT = `(function(){try{var m=localStorage.getItem('theme');m=(m==='light'||m==='dark'||m==='auto')?m:'dark';var r=m==='auto'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):m;document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r;}catch(e){}})();`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "PrivateCopy — confidential copy-trading on NEAR" },
			{
				name: "description",
				content:
					"Copy private trading strategies through NEAR Confidential Intents. Only attested PnL is public.",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "stylesheet", href: walletModalCss },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
				},
			}),
	);

	return (
		<html lang="en" data-theme="dark" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: fixed literal, must run before first paint */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased">
				<QueryClientProvider client={queryClient}>
					<AppHeader />
					{children}
					<AppFooter />
				</QueryClientProvider>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
