import * as actions from './../redux/actions';
import {io} from './../services/socket';
import store from './../redux/store';
import request from 'request';

let db_url = process.env.DB_URL || 'http://localhost:2389';
let timerInterval = null;


io.on('connection', (socket) => {
  socket.emit('sendLeagueId');

  socket.on('returnLeagueId', (data) => {

    if(!store.getState().draftStatus) {
      store.dispatch(actions.getInitialData(data.league_id));
    }
  });

  const updateView = (timeObj) => {
    io.emit('timeUpdate', timeObj);
  };

  const draftCharacter = (pick) => { 
    socket.broadcast.emit('charDrafted', pick);
    if(pick.team_id === store.getState().currentTeamId) {
      stopTimer();
      actions.draftCharacter(pick);
      actions.nextTeam();
      actions.initTimer();
      startTimer();
    }
  };

  store.subscribe(() => {
    let state = store.getState()

    socket.emit('updateStore', state);

    if(state.autoDraft) {
      actions.resetAutoDraft();
      
      let char_index = Math.random() * state.characterIds.length | 0;
      
      let pick = {
        team_id: state.currentTeamId.toString(),
        char_id: state.characterIds[char_index]
      };

      draftCharacter(pick);
    }

    if(state.draftStatus === 'POST_DRAFT' && state.timer.timerIsRunning) {
      stopTimer();
      console.log('leagueID',state.league_id);
      var url = `${db_url}/api/draft/${state.league_id}`;

      console.log('TODO: change team to users && post to ===>>',url);
      state.teams.forEach((team)=>{
        if(!team.loggedOn){
          for(var i = 0; i < 6; i++){
            let char_index = Math.random() * state.characterIds.length | 0;
            team.characters.push(state.characterIds.splice(char_index,1)[0]);
          }
        }
      })
      socket.emit('updateStore', state);
      
      request.post(url).form({league_id:state.league.league_id, users: state.teams});
    }
  });

  const startTimer = () => {
    timerInterval = setInterval(actions.decrementTimer, 1000);
    actions.startTimer();
  };

  const stopTimer = () => {
    clearInterval(timerInterval);
    actions.stopTimer();
  };

  socket.on('startDraft', () => {
    actions.startDraft();
    actions.initTimer();
    startTimer();
  });

  socket.on('startTimer', () => {
    stopTimer();
    actions.initTimer();
    startTimer();
  });

  socket.on('stopTimer', () => {
    stopTimer();
  });

  socket.on('init', (data) => {
    actions.teamLogOn(data);
  });

  socket.on('draftCharacter', (pick) => {
    draftCharacter(pick);
  });

  socket.on('reset', (id=1)=> {
    store.dispatch(actions.getInitialData(id));
    stopTimer();
  })

  socket.on('moose', () => {
    console.log('moose');
    socket.emit('lemur');
  });

});
