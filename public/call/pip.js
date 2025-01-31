const pipContainer = document.getElementById('videoPipContainer');
/*
pipContainer.addEventListener('click', () => {
    pipContainer.classList.toggle('fullscreen');
});

pipContainer.addEventListener('mousedown', function(e) {
    let offsetX = e.clientX - pipContainer.getBoundingClientRect().left;
    let offsetY = e.clientY - pipContainer.getBoundingClientRect().top;

    function onMouseMove(e) {
        pipContainer.style.left = `${e.clientX - offsetX}px`;
        pipContainer.style.top = `${e.clientY - offsetY}px`;
    }

    document.addEventListener('mousemove', onMouseMove);

    document.addEventListener('mouseup', function() {
        document.removeEventListener('mousemove', onMouseMove);
    }, {once: true});
});

*/
// Get the "終了" button
const endCallButton = document.getElementById('end-call');

// Add event listener to the "終了" button
endCallButton.addEventListener('click', endCall);

// Function to close the iframe
function endCall() {
    // Check if the script is running inside an iframe
    if (window.top !== window.self) {
        window.top.postMessage('closeIframe', '*');
    } else {
        console.log('Not running inside an iframe');
    }
}

// Listen for the 'closeIframe' message in the parent window
