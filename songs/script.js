const GIST_API_URL = "https://api.github.com/gists/";
const YOUTUBE_SEARCH_URL = "https://www.youtube.com/results?search_query=";
const CHORUS_SEARCH_URL = "https://chorus.fightthe.pw/search?query=";
const PAGE_SIZE = 50;

const params = new URLSearchParams(window.location.search);
let gistId = null;
let gistData = null;

let artworks = {};
let sources = {};
let songs = [];
let queriedSongList = [];
let queriedSongListEnd = 0;
let songElementMap = new Map();

const difficulties = [
	{ name: "guitar", displayName: "Guitar", icon: "guitar.png" },
	{ name: "bass", displayName: "Bass", icon: "bass.png" },
	{ name: "coop", displayName: "Guitar (Coop)", icon: "guitar-coop.png" },
	{ name: "rhythm", displayName: "Rhythm Guitar", icon: "rhythm.png" },
	{ name: "guitarghl", displayName: "GHL Guitar", icon: "ghl-guitar.png" },
	{ name: "bassghl", displayName: "GHL Bass", icon: "ghl-bass.png" },
	{ name: "coopghl", displayName: "GHL Guitar (Coop)", icon: "ghl-guitar-coop.png" },
	{ name: "rhythmghl", displayName: "GHL Rhythm Guitar", icon: "ghl-rhythm.png" },
	{ name: "drums", displayName: "Drums", icon: "drums.png" },
	{ name: "keys", displayName: "Keys", icon: "keys.png" },
	// { name: "band", displayName: "Full Band", icon: "band.png" },
];

// TODO: Load this from gist
const difficultiesToShow = [
	"guitar", "bass", "drums"
];

$(document).ready(onLoad);

function onLoad(){
	$("#song-list-loading").show();
	$("#load-more").on("click", loadMore);

	if(params.has("gist")){
		gistId = params.get("gist");
		console.log("Gist " + gistId);

		loadGist();
	}else{
		$("#error").text("No Gist specified");
	}

	$("#song-search").submit((e) => {
		e.preventDefault();
		// updateSearch();
	});

	$("#song-search-field").change(() => updateSearch());
}

function loadGist(){
	$.getJSON(GIST_API_URL + gistId, function(data){
		onLoadGist(data);
	});
}

function onLoadGist(data){
	gistData = data;
	console.log(data);

	const moduleName = "CH";
	const songsFileName = `Kiwi-${moduleName}-songs.json`;
	const queueFileName = `Kiwi-${moduleName}-queue.json`;
	const artworksFileName = `Kiwi-${moduleName}-artworks.json`;
	const songsFile = data.files[songsFileName];
	const queueFile = data.files[queueFileName];
	const artworksFile = data.files[artworksFileName];
	if(!songsFile || !queueFile || !artworksFile){
		console.log(`No ${moduleName} files found`);
		return;
	}

	// Load queue data
	$.getJSON(queueFile.raw_url, function(queueData){
		onLoadQueue(queueData);

		// Load artwork data
		$.getJSON(artworksFile.raw_url, function(artworkData){
			onLoadArtworks(artworkData);

			// Load song data
			$.getJSON(songsFile.raw_url, function(songData){
				onLoadSongs(songData);
			});
		});
	});
}

function onLoadQueue(data){
	if(!data){
		console.log("Invalid queue data");
		return;
	}

	let avatar = gistData.owner.avatar_url;
	let title = `${gistData.owner.login}'s Song List`;
	let desc = "";

	if(data.songList){
		avatar = data.songList.avatar || avatar;
		title = data.songList.name || title;
		desc = data.songList.description || desc;
	}

	$("#avatar").attr("src", avatar);
	$("#title").text(title);
	$("#description").text(desc);

	document.title = title;
}

function onLoadArtworks(data){
	if(!data || !data.artworks){
		console.log("Invalid artwork data");
		return;
	}

	artworks = data.artworks;
}

function onLoadSongs(data){
	if(!data || !data.hash || !data.songs){
		console.log("Invalid song data");
		return;
	}

	songs = data.songs;
	sources = data.sources;

	destroyAllSongs();

	console.log(songs.length + " songs loaded");
	console.log(songs);
	console.log(sources);
	console.log(songs[0]);

	updateSearch();

	$("#song-list-loading").fadeOut(500);
}

function createSong(song){
	let source = sources[song.source];
	if(!source)
		source = "No Source";

	let difficultiesHtml = "";
	for(let i = 0; i < difficulties.length; i++){
		const diff = difficulties[i];
		if(!difficultiesToShow.includes(diff.name))
			continue;

		const value = song[`diff_${diff.name}`];
		if(isNaN(value) || value === "-1")
			continue;

		let ratio = value / 6;
		if(ratio < 0)
			ratio = 0;
		else if(ratio > 1)
			ratio = 1;

		const icon = `icons/${diff.icon}`;

		const arc = arcDrawer.describeArc(25, 25, 25, 0, ratio * 360, true);

		difficultiesHtml += `
			<div class="song-difficulty">
				<svg>
					<path fill="var(--color-difficulty)" d="${arc}" />
				</svg>

				<img class="song-difficulty__icon"
					src="${icon}"
					alt="${diff.displayName}"
				/>
			</div>
		`;
	}

	const songLink = CHORUS_SEARCH_URL + utils.escape(`name="${song.name}" artist="${song.artist}" charter="${song.charter}"`);
	const artistLink = CHORUS_SEARCH_URL + utils.escape(`artist="${song.artist}"`);
	const charterLink = CHORUS_SEARCH_URL + utils.escape(`charter="${song.charter}"`);

	const element = $(`
		<div class="song">
			<a class="song__image"
				style="background-image: url(data:image/jpeg;base64,${utils.escape(artworks[song.artwork])})"
				title="${utils.escape(song.album)} (${utils.escape(song.year)})"
				href="${songLink}"
			></a>

			<div class="song__main">
				<div class="song__title">
					<a class="song__text song__text--name" href="${songLink}">${utils.escape(song.name)}</a>
					<a class="song__text song__text--artist" href="${artistLink}">${utils.escape(song.artist)}</a>
					<a class="song__text song__text--charter" href="${charterLink}">${utils.escape(song.charter)}</a>
				</div>
				<div class="song__content">
					<div class="song__group">
						<div class="song__info">
							${utils.escape(song.album)} (${utils.escape(song.year)}) • ${utils.escape(song.genre)} • ${utils.formatLength(song.length)}<br>
							${utils.escape(source)}
						</div>

						<div class="song__request">!request ${utils.escape(song.id || song.hash)}</div>
					</div>
					<div class="song__group song__group--difficulties">
						${difficultiesHtml}
					</div>
				</div>
			</div>
		</div>
	`);

	$("#song-list").append(element);
	songElementMap.set(song, element);

	return element;
}

function destroyAllSongs(){
	$("#song-list").empty();
	songElementMap.clear();
}

function updateSearch(start, end){
	const query = $("#song-search-field").val().trim().toLowerCase();

	if(!start && !end){
		destroyAllSongs();
		queriedSongList = [];
		queriedSongListEnd = PAGE_SIZE;

		if(query === ""){
			queriedSongList = [...songs];
			utils.shuffle(queriedSongList);
		}else{
			for(const song of songs){
				let found = false;
				const fields = [
					song.id,
					song.hash,
					song.name,
					song.artist,
					song.charter,
					song.genre,
					song.year,
					song.playlist,
					sources[song.source],
				];

				for(const field of fields){
					if(!field) continue;

					if(field.toLowerCase().includes(query)){
						found = true;
						break;
					}
				}

				if(found){
					queriedSongList.push(song);
				}
			}
		}
		
		start = 0;
		end = queriedSongListEnd;
	}

	for(let i = start; i < Math.min(end, queriedSongList.length); i++){
		createSong(queriedSongList[i]);
	}

	$("#query-info").text(`${queriedSongList.length} of ${songs.length} songs found`);

	if(songElementMap.size === queriedSongList.length){
		$("#load-more").hide();
	}else{
		$("#load-more").show();
	}
}

function loadMore(){
	start = queriedSongListEnd;
	queriedSongListEnd += PAGE_SIZE;

	updateSearch(start, queriedSongListEnd);
}