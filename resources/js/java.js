export class JavaService {
  async detect() {
    const candidates = [];
    const javaHome = await Neutralino.os.getEnv('JAVA_HOME').catch(() => '');
    if (javaHome) {
      candidates.push(`${javaHome.replace(/\\/g, '/')}/bin/java`);
      candidates.push(`${javaHome.replace(/\\/g, '/')}/bin/java.exe`);
    }
    candidates.push('java');

    for (const candidate of candidates) {
      try {
        const result = await Neutralino.os.execCommand(`\"${candidate}\" -version`);
        const output = `${result.stdErr || ''}\n${result.stdOut || ''}`.trim();
        if (result.exitCode === 0 || /version/i.test(output)) {
          const firstLine = output.split(/\r?\n/)[0] || 'Java detected';
          return { found: true, path: candidate, version: firstLine };
        }
      } catch {}
    }

    return { found: false, path: '', version: '' };
  }
}
