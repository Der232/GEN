import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutes default stale time
			},
		},
	});

	return {
		queryClient,
	};
}

export default function TanstackQueryProvider({
	children,
	queryClient,
}: {
	children?: React.ReactNode;
	queryClient: QueryClient;
}) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
