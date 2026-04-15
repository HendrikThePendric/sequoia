const GREEN = '\x1b[32m'
const LOGO = [
    '',
    '            %%%,%%%%%%%',
    "             ,'%% \\\\-*%%%%%%%",
    '       ;%%%%%*%   _%%%%"',
    '        ,%%%       \\(_.*%%%%.',
    "        % *%%, ,%%%%*(    '",
    '      %^     ,*%%% )\\|,%%*%,_',
    '           *%    \\/ #).-"*%%*',
    '               _.) ,/ *%,',
    '       _________/)#(_____________',
    '          Specify your tree',
].join('\n')

export function showPromptHeader() {
    console.log(GREEN, LOGO)
}
