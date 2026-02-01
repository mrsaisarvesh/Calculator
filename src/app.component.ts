import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoundService } from './sound.service';

type ButtonType = 'operator' | 'number' | 'special' | 'equals' | 'memory';

interface CalcButton {
  label: string;
  value: string;
  type: ButtonType;
  class?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class AppComponent {
  display = signal<string>('0');
  private memory = signal<number>(0);
  private soundService = inject(SoundService);
  isMemorySet = computed(() => this.memory() !== 0);

  displayFontSize = computed(() => {
    const displayValue = this.display();
    let len = displayValue.length;
    if (displayValue.includes('.')) len--;
    if (displayValue.startsWith('-')) len--;

    if (len > 9) return 4;
    if (len > 7) return 5;
    return 6;
  });

  displayOperator = computed(() => {
    const op = this.operator();
    if (!op) return '';
    switch (op) {
      case '/': return '÷';
      case '*': return '×';
      case '-': return '−';
      case '+': return '+';
      default: return '';
    }
  });

  private firstOperand = signal<number | null>(null);
  private operator = signal<string | null>(null);
  private waitingForSecondOperand = signal<boolean>(false);

  buttons: CalcButton[] = [
    { label: 'MC', value: 'mc', type: 'memory' },
    { label: 'MR', value: 'mr', type: 'memory' },
    { label: 'M-', value: 'm-', type: 'memory' },
    { label: 'M+', value: 'm+', type: 'memory' },
    { label: 'AC', value: 'clear', type: 'special' },
    { label: '+/-', value: 'negate', type: 'special' },
    { label: '%', value: 'percent', type: 'special' },
    { label: '÷', value: '/', type: 'operator' },
    { label: '7', value: '7', type: 'number' },
    { label: '8', value: '8', type: 'number' },
    { label: '9', value: '9', type: 'number' },
    { label: '×', value: '*', type: 'operator' },
    { label: '4', value: '4', type: 'number' },
    { label: '5', value: '5', type: 'number' },
    { label: '6', value: '6', type: 'number' },
    { label: '−', value: '-', type: 'operator' },
    { label: '1', value: '1', type: 'number' },
    { label: '2', value: '2', type: 'number' },
    { label: '3', value: '3', type: 'number' },
    { label: '+', value: '+', type: 'operator' },
    { label: '0', value: '0', type: 'number', class: 'col-span-2' },
    { label: '.', value: '.', type: 'number' },
    { label: '=', value: '=', type: 'equals' },
  ];

  onButtonClick(value: string): void {
    this.soundService.playClickSound();
    if (this.isNumber(value)) {
      this.inputDigit(value);
    } else if (this.isOperator(value)) {
      this.handleOperator(value);
    } else {
      switch (value) {
        case '.':
          this.inputDecimal();
          break;
        case 'clear':
          this.clear();
          break;
        case 'negate':
          this.negate();
          break;
        case 'percent':
          this.percent();
          break;
        case '=':
          this.calculateResult();
          break;
        case 'mc':
          this.memoryClear();
          break;
        case 'mr':
          this.memoryRecall();
          break;
        case 'm-':
          this.memorySubtract();
          break;
        case 'm+':
          this.memoryAdd();
          break;
      }
    }
  }

  private isNumber(value: string): boolean {
    return !isNaN(parseFloat(value));
  }
  
  private isOperator(value: string): boolean {
    return ['/', '*', '-', '+'].includes(value);
  }

  private inputDigit(digit: string): void {
    if (this.waitingForSecondOperand()) {
      this.display.set(digit);
      this.waitingForSecondOperand.set(false);
      return;
    }

    if (this.display().length >= 15) return;

    this.display.update(d => (d === '0' ? digit : d + digit));
  }

  private inputDecimal(): void {
    if (this.waitingForSecondOperand()) {
        this.display.set('0.');
        this.waitingForSecondOperand.set(false);
        return;
    }
    
    if (this.display().length >= 15) return;

    if (!this.display().includes('.')) {
      this.display.update(d => d + '.');
    }
  }

  private handleOperator(nextOperator: string): void {
    const inputValue = parseFloat(this.display());

    if (this.operator() && this.waitingForSecondOperand()) {
      this.operator.set(nextOperator);
      return;
    }

    if (this.firstOperand() === null) {
      this.firstOperand.set(inputValue);
    } else if (this.operator()) {
      const result = this.calculate(this.firstOperand()!, this.operator()!, inputValue);
      this.display.set(String(result));
      this.firstOperand.set(result);
    }

    this.waitingForSecondOperand.set(true);
    this.operator.set(nextOperator);
  }

  private calculateResult(): void {
    if (this.operator() === null || this.firstOperand() === null) {
        return;
    }
    const secondOperand = parseFloat(this.display());
    const result = this.calculate(this.firstOperand()!, this.operator()!, secondOperand);
    this.display.set(String(result));
    this.firstOperand.set(null);
    this.operator.set(null);
    this.waitingForSecondOperand.set(false);
  }

  private calculate(first: number, op: string, second: number): number {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '*': return first * second;
      case '/': return first / second;
      default: return second;
    }
  }

  private clear(): void {
    this.display.set('0');
    this.firstOperand.set(null);
    this.operator.set(null);
    this.waitingForSecondOperand.set(false);
  }

  private negate(): void {
    this.display.update(d => String(parseFloat(d) * -1));
  }

  private percent(): void {
    this.display.update(d => String(parseFloat(d) / 100));
  }

  private memoryClear(): void {
    this.memory.set(0);
  }

  private memoryRecall(): void {
    this.display.set(String(this.memory()));
    this.waitingForSecondOperand.set(true);
  }

  private memoryAdd(): void {
    this.memory.update(m => m + parseFloat(this.display()));
    this.waitingForSecondOperand.set(true);
  }

  private memorySubtract(): void {
    this.memory.update(m => m - parseFloat(this.display()));
    this.waitingForSecondOperand.set(true);
  }

  getButtonClass(type: ButtonType): string {
    const baseGlass = 'rounded-2xl backdrop-blur-sm border border-white/10 shadow-lg active:shadow-sm transform active:scale-95 transition-all duration-150';
    switch(type) {
      case 'operator':
        return `bg-violet-500/40 hover:bg-violet-500/60 text-white font-medium ${baseGlass}`;
      case 'equals':
        return `bg-violet-600/70 hover:bg-violet-600/90 text-white font-bold ${baseGlass}`;
      case 'special':
        return `bg-white/20 hover:bg-white/30 text-white ${baseGlass}`;
      case 'memory':
        return `bg-white/10 hover:bg-white/20 text-white ${baseGlass}`;
      case 'number':
      default:
        return `bg-white/30 hover:bg-white/40 text-white ${baseGlass}`;
    }
  }
}
