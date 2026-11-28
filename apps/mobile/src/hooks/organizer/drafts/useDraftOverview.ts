import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { getDraft, getDraftPeople, type DraftDetail } from "../../../api/drafts";
import { isEmailVerifyRequired } from "../../../api/errors";
import { useOrganizerGa4 } from "../../../components/analytics/OrganizerGa4";
import { draftQueryKeys } from "../../../utilities/organizer/draftQueryKeys";
import { draftLoadFailure } from "../../../utilities/organizer/draftStart";

interface Options {
  markEmailVerifyRequired: (dueAt?: number) => void;
}

/**
 * One draft for the overview screen. Refetches whenever the screen regains focus (e.g. back from
 * the wizard) so a co-organizer's changes show up without a manual refresh.
 */
export function useDraftOverview(id: string, { markEmailVerifyRequired }: Options) {
  const queryClient = useQueryClient();
  const sendAnalytics = useOrganizerGa4();
  const [refreshing, setRefreshing] = useState(false);
  const focusedOnce = useRef(false);

  const query = useQuery({ queryKey: draftQueryKeys.detail(id), queryFn: () => getDraft(id), retry: false });
  const draft = query.data ?? null;
  // People needs sharing enabled; without it the co-organizer row just stays hidden.
  const people = useQuery({
    queryKey: draftQueryKeys.people(id),
    queryFn: () => getDraftPeople(id),
    enabled: Boolean(draft) && !draft?.startedTournamentId,
    retry: false
  });

  useEffect(() => {
    if (isEmailVerifyRequired(query.error)) markEmailVerifyRequired(query.error.verifyBy);
  }, [query.error, markEmailVerifyRequired]);

  const opened = Boolean(draft);
  useEffect(() => {
    if (opened) sendAnalytics({ event: "draft_action", action: "opened" });
  }, [opened, sendAnalytics]);

  const { refetch } = query;
  const refetchPeople = people.refetch;
  useFocusEffect(
    useCallback(() => {
      // The first focus is the initial mount, which the query already fetches.
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      void refetch();
      void refetchPeople();
    }, [refetch, refetchPeople])
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchPeople()]);
    setRefreshing(false);
  };

  return {
    draft,
    loading: query.isPending,
    failure: query.error && !isEmailVerifyRequired(query.error) ? draftLoadFailure(query.error) : null,
    editors: people.data?.editors ?? [],
    refreshing,
    refresh,
    /** Show a version fetched elsewhere (e.g. after a start conflict) without another request. */
    adoptLatest: (latest: DraftDetail) => queryClient.setQueryData(draftQueryKeys.detail(id), latest),
    invalidateList: () => queryClient.invalidateQueries({ queryKey: draftQueryKeys.list() })
  };
}

export type DraftOverviewController = ReturnType<typeof useDraftOverview>;
