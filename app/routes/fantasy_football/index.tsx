import {useLoaderData} from "@remix-run/react";
import { useState } from "react";
import supabase from "~/utils/supabase";

import { capitalizeFirstLetter } from "~/utils/helpers";

import type { LoaderArgs } from "@remix-run/node";
import type { allTimeObject, seasonDetailsObject } from "../../../db_types";

import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from '@chakra-ui/react'

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const season = url.searchParams.get("season");
    const {data: managerData, error: managerError} = await supabase
        .from('manager')
        .select('id, name')

    let allTimeData: allTimeObject[] | null = null;
    let seasonData: seasonDetailsObject[] | null = null;
    if(season) {
        const seasonInt = parseInt(season);
        if(!seasonInt) {
            return {
                error: "Invalid season",
                managers: [],
                allTime: [],
                season: []
            }
        }

        const {data: seasonResponse, error: seasonError} = await supabase
            .rpc('season_details', {season_year: seasonInt})

        seasonData = seasonResponse;
        seasonData?.sort((a, b) => b.total_wins - a.total_wins);

        if (managerError || seasonError) {
            return {
                error: managerError || seasonError,
                managers: [],
                allTime: [],
                season: [],
            }
        }
    } else {
        const {data: allTimeResponse, error: allTimeError} = await supabase
            .rpc('all_time')

        if (managerError || allTimeError) {
            return {
                error: managerError || allTimeError,
                managers: [],
                allTime: [],
                season: []
            }
        }

        allTimeData = allTimeResponse;
        allTimeData?.sort((a, b) => (b.total_wins / b.total_games) - (a.total_wins / a.total_games))
    }

    return {
        error: null,
        managers: managerData ?? [],
        allTime: allTimeData ?? [],
        season: seasonData ?? []
    }
}

export default function Index() {
    const {managers, allTime, error, season} = useLoaderData<typeof loader>()
    const [showAverage, setShowAverage] = useState(false)
    console.log(allTime)
    console.log(season)
    return (
    <div>
      <h1 style={{
          fontFamily: "Outfit, sans-serif",
          fontWeight: 200,
      }}>Hello Fantasy Football</h1>
        <TableContainer>
            <Table size='sm' colorScheme='orange'>
                <Thead>
                    <Tr>
                        <Th>Manager</Th>
                        {/*<Th isNumeric>Total Games</Th>*/}
                        {/*<Th isNumeric>Wins</Th>*/}
                        <Th isNumeric>Winning %</Th>
                        <Th isNumeric>Titles</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {allTime?.map((manager) => (
                        <Tr>
                            <Td>{capitalizeFirstLetter(manager.name)}</Td>
                            {/*<Td isNumeric>{manager.total_games}</Td>*/}
                            {/*<Td isNumeric>{manager.total_wins}</Td>*/}
                            <Td isNumeric>{(manager.total_wins / manager.total_games).toFixed(3)}</Td>
                            <Td isNumeric>{manager.championships}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </TableContainer>
    </div>
  );
}