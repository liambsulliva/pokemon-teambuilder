import { NextApiRequest, NextApiResponse } from 'next';
import type { pokemonInfo } from '@/lib/pokemonInterface';
import fetch from 'node-fetch';

interface PokemonData {
	forms: { name: string; url: string }[];
	name: string;
	id: number;
	types: Array<{ type: { name: string } }>;
	abilities: Array<{
		ability: { name: string; url: string };
		is_hidden: boolean;
	}>;
	sprites: {
		versions: {
			'generation-v': {
				'black-white': {
					animated: {
						front_default: string | null;
					};
				};
			};
		};
	};
	stats: Array<{ base_stat: number }>;
	moves: {
		version_group_details: {
			version_group: { name: string };
			level_learned_at: number;
		}[];
		move: {
			name: string;
			url: string;
		};
	}[];
	location_area_encounters: string;
	species: { name: string; url: string };
	cries: { latest: string; legacy: string };
}

interface AbilityData {
	effect_entries: Array<{
		language: { name: string };
		effect: string;
	}>;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === 'GET') {
		if (!req.query.id) {
			res.status(404).json({ message: 'No Pokemon Queried' });
			return;
		}
		try {
			const response = await fetch(
				'https://pokeapi.co/api/v2/pokemon/' + req.query.id
			);
			if (!response.ok) {
				console.error('Failed to fetch data:', response.status);
				res.status(404).json({ message: 'Failed to fetch Pokemon data' });
				return;
			}
			const data = (await response.json()) as PokemonData;

			// Fetch ability details
			const abilitiesWithEffects = await Promise.all(
				data.abilities.map(async (ability) => {
					const abilityResponse = await fetch(ability.ability.url);
					const abilityData = (await abilityResponse.json()) as AbilityData;
					const effect =
						abilityData.effect_entries.find(
							(entry) => entry.language.name === 'en'
						)?.effect || 'No English description available';
					return {
						ability: { name: ability.ability.name },
						effect,
						is_hidden: ability.is_hidden,
					};
				})
			);

			// Construct the pokemonInfo object
			const pokemonInfo: pokemonInfo = {
				name: data.name,
				id: data.id,
				types: data.types,
				abilities: abilitiesWithEffects,
				sprites: data.sprites,
				stats: data.stats,
				moves: data.moves,
				forms: data.forms,
				location_area_encounters: data.location_area_encounters,
				species: data.species,
				cries: data.cries,
			};

			console.log(pokemonInfo);
			res.status(200).json(pokemonInfo);
		} catch (error) {
			console.error(error);
			res.status(500).json({ message: 'Internal Server Error' });
		}
	} else {
		res.setHeader('Allow', ['GET']);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
};

export default handler;
