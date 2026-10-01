(() => {
  const els = {
    overlay: document.getElementById('startOverlay'), start: document.getElementById('startBtn'),
    title: document.getElementById('slideTitle'), counter: document.getElementById('slideCounter'),
    image: document.getElementById('slideImage'), audio: document.getElementById('slideAudio'),
    video: document.getElementById('slideVideo'), back: document.getElementById('backBtn'),
    next: document.getElementById('nextBtn'), replay: document.getElementById('replayBtn'),
    pause: document.getElementById('pauseBtn'), progress: document.getElementById('progressBar'),
    transcriptBtn: document.getElementById('transcriptBtn'), transcript: document.getElementById('transcriptPanel'),
    transcriptText: document.getElementById('transcriptText'), stageWrap: document.querySelector('.stage-wrap'),
    interaction: document.getElementById('interactionPanel')
  };

  let index = 0;
  let started = false;
  let interactionPassed = true;

  SCORM.init();
  const bookmarked = parseInt(SCORM.get('cmi.core.lesson_location') || localStorage.getItem(COURSE.id + ':location') || '0', 10);
  if (Number.isInteger(bookmarked) && bookmarked >= 0 && bookmarked < COURSE.slides.length) index = bookmarked;

  function saveLocation() {
    localStorage.setItem(COURSE.id + ':location', String(index));
    SCORM.set('cmi.core.lesson_location', index);
    if (SCORM.get('cmi.core.lesson_status') === 'not attempted' || !SCORM.get('cmi.core.lesson_status')) {
      SCORM.set('cmi.core.lesson_status', 'incomplete');
    }
    SCORM.commit();
  }

  function stopMedia() {
    els.audio.pause(); els.audio.currentTime = 0;
    els.video.pause(); els.video.removeAttribute('src'); els.video.load(); els.video.hidden = true;
  }

  async function playCurrentMedia() {
    if (!started) return;
    const slide = COURSE.slides[index];
    try {
      if (slide.video) {
        els.video.hidden = false;
        els.video.src = slide.video;
        els.video.currentTime = 0;
        await els.video.play();
      } else if (slide.audio) {
        els.audio.src = slide.audio;
        els.audio.currentTime = 0;
        await els.audio.play();
      }
    } catch (err) {
      // Browser policy or device setting blocked autoplay. Replay remains available.
      console.info('Autoplay blocked:', err);
    }
  }

  function renderInteraction(slide) {
    els.interaction.innerHTML = '';
    els.interaction.hidden = true;
    interactionPassed = true;
    if (!slide.interaction) return;

    const q = slide.interaction;
    interactionPassed = false;
    els.interaction.hidden = false;
    els.interaction.innerHTML = `<h2>${escapeHTML(q.prompt)}</h2><div class="choices"></div><div class="feedback" aria-live="polite"></div>`;
    const choices = els.interaction.querySelector('.choices');
    const feedback = els.interaction.querySelector('.feedback');
    q.choices.forEach((choice, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = choice;
      b.addEventListener('click', () => {
        const ok = i === q.correctIndex;
        feedback.textContent = ok ? (q.correctFeedback || 'Correct.') : (q.incorrectFeedback || 'Please try again.');
        feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
        interactionPassed = ok || q.allowContinueAfterAttempt === true;
        updateButtons();
      });
      choices.appendChild(b);
    });
  }

  function escapeHTML(s='') { return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function updateButtons() {
    els.back.disabled = index === 0;
    els.next.disabled = !interactionPassed;
    els.next.textContent = index === COURSE.slides.length - 1 ? 'Complete ✓' : 'Next →';
  }

  function render({ autoplay = true } = {}) {
    stopMedia();
    const slide = COURSE.slides[index];
    els.title.textContent = slide.title || `Slide ${index + 1}`;
    els.counter.textContent = `${index + 1} / ${COURSE.slides.length}`;
    els.image.src = slide.image;
    els.image.alt = slide.alt || slide.title || `Slide ${index + 1}`;
    els.transcriptText.innerHTML = slide.transcript ? `<p>${escapeHTML(slide.transcript).replace(/\n/g,'</p><p>')}</p>` : '<p>No transcript is provided for this slide.</p>';
    els.progress.style.width = `${((index + 1) / COURSE.slides.length) * 100}%`;
    renderInteraction(slide);
    updateButtons();
    saveLocation();
    if (autoplay) playCurrentMedia();
  }

  function go(delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= COURSE.slides.length) return;
    index = nextIndex;
    render();
  }

  function completeCourse() {
    SCORM.set('cmi.core.lesson_status', 'completed');
    SCORM.set('cmi.core.lesson_location', COURSE.slides.length - 1);
    SCORM.commit();
    localStorage.setItem(COURSE.id + ':complete', 'true');
    els.next.textContent = 'Completed ✓';
    els.next.disabled = true;
  }

  els.start.addEventListener('click', () => {
    started = true;
    els.overlay.classList.add('hidden');
    render({ autoplay: true });
  });
  els.back.addEventListener('click', () => go(-1));
  els.next.addEventListener('click', () => {
    if (!interactionPassed) return;
    if (index === COURSE.slides.length - 1) completeCourse(); else go(1);
  });
  els.replay.addEventListener('click', playCurrentMedia);
  els.pause.addEventListener('click', () => {
    if (!els.video.hidden && !els.video.paused) { els.video.pause(); els.pause.textContent = 'Resume'; return; }
    if (!els.audio.paused) { els.audio.pause(); els.pause.textContent = 'Resume'; return; }
    if (!els.video.hidden && els.video.src) els.video.play(); else els.audio.play();
    els.pause.textContent = 'Pause';
  });
  els.transcriptBtn.addEventListener('click', () => {
    const open = els.transcript.hidden;
    els.transcript.hidden = !open;
    els.stageWrap.classList.toggle('with-transcript', open);
    els.transcriptBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => {
    if (els.overlay.classList.contains('hidden')) {
      if (e.key === 'ArrowRight' && !els.next.disabled) els.next.click();
      if (e.key === 'ArrowLeft' && !els.back.disabled) els.back.click();
    }
  });
  window.addEventListener('beforeunload', () => { saveLocation(); SCORM.finish(); });

  // Render the bookmarked slide behind the Start overlay.
  render({ autoplay: false });
})();
