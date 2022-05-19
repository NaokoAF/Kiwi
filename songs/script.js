const GIST_API_URL = "https://api.github.com/gists/";
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
	{ name: "rhythm", displayName: "Rhythm Guitar", icon: "guitar-rhythm.png" },
	{ name: "ghl", displayName: "Guitar Hero Live", icon: "guitar-ghl.png" },
	{ name: "drums", displayName: "Drums", icon: "drums.png" },
	{ name: "keys", displayName: "Keys", icon: "keys.png" },
	{ name: "band", displayName: "Full Band", icon: "band.png" },
];

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
	if(!songsFile || !queueFile){
		console.log(`No ${moduleName} files found`);
		return;
	}

	// TODO: Load queue, then artworks, then songs (instead of doing it in parallel)

	if(queueFile.truncated){
		$.getJSON(queueFile.raw_url, function(queueData){
			onLoadQueue(queueData);
		});
	}else{
		onLoadQueue(JSON.parse(queueFile.content));
	}

	if(artworksFile){
		if(artworksFile.truncated){
			$.getJSON(artworksFile.raw_url, function(artworkData){
				onLoadArtworks(artworkData);
			});
		}else{
			onLoadArtworks(JSON.parse(artworksFile.content));
		}
	}

	if(songsFile.truncated){
		$.getJSON(songsFile.raw_url, function(songData){
			onLoadSongs(songData);
		});
	}else{
		onLoadSongs(JSON.parse(songsFile.content));
	}
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

function onLoadArtworks(data){
	if(!data || !data.artworks){
		console.log("Invalid artwork data");
		return;
	}

	artworks = data.artworks;
}

function createSong(song){
	let source = sources[song.source];
	if(source)
		source = source.replace("=' ", ""); // not necessary anymore
	else
		source = "No Source";

	song.source = source;

	let difficultiesHtml = "";
	for(let i = 0; i < difficulties.length; i++){
		const diff = difficulties[i];
		if(!difficultiesToShow.includes(diff.name))
			continue;

		const value = song[`diff_${diff.name}`];
		if(isNaN(value) || value === "-1")
			continue;

		const scale = value / 6;
		const icon = `icons/${diff.icon}`;

		difficultiesHtml += `
			<div class="song-difficulty">
				<div class="song-difficulty__background"
					style="transform: scaleY(${scale*100}%)"
				></div>

				<img class="song-difficulty__icon"
					src="${icon}"
					alt="${diff.displayName}"
				/>
			</div>
		`;
	}

	const element = $(`
		<div class="song">
			<div class="song__image"
				style="background-image: url(data:image/jpeg;base64,${artworks[song.artwork]})"
			></div>

			<div class="song__main">
				<div class="song__title">
					<div class="song__name">${utils.escape(song.name)}</div>
					<div class="song__artist">${utils.escape(song.artist)}</div>
					<div class="song__charter">${utils.escape(song.charter)}</div>
				</div>
				<div class="song__content">
					<div class="song__group">
						<div class="song__info">
							${utils.escape(song.album)} (${utils.escape(song.year)}) • ${utils.escape(song.genre)} • ${utils.formatLength(song.length)}<br>
							${utils.escape(song.source)}
						</div>

						<div class="song__hash">!request ${utils.escape(song.hash)}</div>
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
			queriedSongList = songs;
		}else{
			for(const song of songs){
				let found = false;
				if(song.hash.toLowerCase() === query){
					found = true;
				}else{
					const fields = [
						song.name,
						song.artist,
						song.charter,
						song.genre,
						song.year,
						song.source,
						song.playlist,
						song.source,
					];

					for(const field of fields){
						if(!field) continue;

						if(field.toLowerCase().includes(query)){
							found = true;
							break;
						}
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

	$("#query-info").text(`${songElementMap.size}/${queriedSongList.length} songs listed.`);
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